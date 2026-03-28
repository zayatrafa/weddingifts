using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

namespace Weddingifts.Api.Services;

public class GiftService
{
    private const int MaxGiftNameLength = 120;
    private const int MaxGiftDescriptionLength = 500;
    private const decimal MinGiftPrice = 0m;
    private const decimal MaxGiftPriceExclusive = 1_000_000m;
    private const int MinGiftQuantity = 1;
    private const int MaxGiftQuantity = 100_000;

    private readonly AppDbContext _context;

    public GiftService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Gift> CreateGift(int eventId, CreateGiftRequest request)
    {
        ValidateCreateGiftRequest(eventId, request.Name, request.Description, request.Price, request.Quantity);

        var eventExists = await _context.Events.AnyAsync(e => e.Id == eventId);
        if (!eventExists)
            throw new ResourceNotFoundException("Evento não encontrado.");

        var gift = BuildGift(eventId, request.Name, request.Description, request.Price, request.Quantity);

        _context.Gifts.Add(gift);
        await _context.SaveChangesAsync();

        return gift;
    }

    public async Task<Gift> CreateGiftForUser(int eventId, int userId, CreateGiftRequest request)
    {
        ValidateCreateGiftRequest(eventId, request.Name, request.Description, request.Price, request.Quantity);

        await EnsureEventOwnership(eventId, userId);

        var gift = BuildGift(eventId, request.Name, request.Description, request.Price, request.Quantity);

        _context.Gifts.Add(gift);
        await _context.SaveChangesAsync();

        return gift;
    }

    public async Task<Gift> UpdateGiftForUser(int eventId, int giftId, int userId, UpdateGiftRequest request)
    {
        ValidateCreateGiftRequest(eventId, request.Name, request.Description, request.Price, request.Quantity);

        await EnsureEventOwnership(eventId, userId);

        if (giftId <= 0)
            throw new DomainValidationException("Id do presente deve ser maior que zero.");

        var gift = await _context.Gifts
            .FirstOrDefaultAsync(g => g.Id == giftId && g.EventId == eventId);

        if (gift is null)
            throw new ResourceNotFoundException("Presente não encontrado.");

        if (gift.ReservedQuantity > request.Quantity)
            throw new DomainValidationException("A quantidade não pode ser menor que a quantidade já reservada.");

        gift.Name = request.Name.Trim();
        gift.Description = request.Description?.Trim() ?? string.Empty;
        gift.Price = request.Price;
        gift.Quantity = request.Quantity;

        await _context.SaveChangesAsync();

        return gift;
    }

    public async Task DeleteGiftForUser(int eventId, int giftId, int userId)
    {
        await EnsureEventOwnership(eventId, userId);

        if (giftId <= 0)
            throw new DomainValidationException("Id do presente deve ser maior que zero.");

        var gift = await _context.Gifts
            .FirstOrDefaultAsync(g => g.Id == giftId && g.EventId == eventId);

        if (gift is null)
            throw new ResourceNotFoundException("Presente não encontrado.");

        _context.Gifts.Remove(gift);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Gift>> GetGiftsByEvent(int eventId)
    {
        if (eventId <= 0)
            throw new DomainValidationException("Id do evento deve ser maior que zero.");

        var eventExists = await _context.Events.AnyAsync(e => e.Id == eventId);
        if (!eventExists)
            throw new ResourceNotFoundException("Evento não encontrado.");

        return await _context.Gifts
            .AsNoTracking()
            .Where(g => g.EventId == eventId)
            .OrderBy(g => g.Id)
            .ToListAsync();
    }

    public async Task<Gift> ReserveGift(int giftId, ReserveGiftRequest request)
    {
        if (giftId <= 0)
            throw new DomainValidationException("Id do presente deve ser maior que zero.");

        var normalizedCpf = EventGuestService.NormalizeCpf(request.GuestCpf);

        var gift = await _context.Gifts.FirstOrDefaultAsync(g => g.Id == giftId);
        if (gift is null)
            throw new ResourceNotFoundException("Presente não encontrado.");

        if (gift.Quantity <= 0)
            throw new DomainValidationException("Não é possível reservar um presente com quantidade zero.");

        if (gift.ReservedQuantity >= gift.Quantity)
            throw new DomainValidationException("Este presente já está totalmente reservado.");

        var guestIsInvited = await _context.EventGuests
            .AnyAsync(g => g.EventId == gift.EventId && g.Cpf == normalizedCpf);

        if (!guestIsInvited)
            throw new DomainValidationException("Este CPF não está convidado para este evento.");

        gift.ReservedQuantity += 1;
        gift.ReservedBy = normalizedCpf;
        gift.ReservedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return gift;
    }

    public async Task<Gift> UnreserveGift(int giftId)
    {
        if (giftId <= 0)
            throw new DomainValidationException("Id do presente deve ser maior que zero.");

        var gift = await _context.Gifts.FirstOrDefaultAsync(g => g.Id == giftId);
        if (gift is null)
            throw new ResourceNotFoundException("Presente não encontrado.");

        if (gift.ReservedQuantity <= 0)
            throw new DomainValidationException("Este presente não possui reserva ativa.");

        gift.ReservedQuantity -= 1;

        if (gift.ReservedQuantity == 0)
        {
            gift.ReservedBy = null;
            gift.ReservedAt = null;
        }

        await _context.SaveChangesAsync();

        return gift;
    }

    private async Task EnsureEventOwnership(int eventId, int userId)
    {
        if (userId <= 0)
            throw new DomainValidationException("Id do usuário autenticado é inválido.");

        if (eventId <= 0)
            throw new DomainValidationException("Id do evento deve ser maior que zero.");

        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId);

        if (ev is null)
            throw new ResourceNotFoundException("Evento não encontrado.");

        if (ev.UserId != userId)
            throw new ForbiddenOperationException("Você não tem permissão para modificar este evento.");
    }

    private static void ValidateCreateGiftRequest(int eventId, string name, string? description, decimal price, int quantity)
    {
        if (eventId <= 0)
            throw new DomainValidationException("Id do evento deve ser maior que zero.");

        if (string.IsNullOrWhiteSpace(name))
            throw new DomainValidationException("Nome do presente é obrigatório.");

        if (name.Trim().Length > MaxGiftNameLength)
            throw new DomainValidationException("Nome do presente excede o tamanho máximo permitido.");

        if (!string.IsNullOrWhiteSpace(description) && description.Trim().Length > MaxGiftDescriptionLength)
            throw new DomainValidationException("Descrição do presente excede o tamanho máximo permitido.");

        if (price <= MinGiftPrice)
            throw new DomainValidationException("Preço deve ser maior que zero.");

        if (price >= MaxGiftPriceExclusive)
            throw new DomainValidationException("Preço deve ser menor que 1000000.");

        if (quantity < MinGiftQuantity)
            throw new DomainValidationException("Quantidade deve ser maior ou igual a 1.");

        if (quantity > MaxGiftQuantity)
            throw new DomainValidationException("Quantidade deve ser menor ou igual a 100000.");
    }

    private static Gift BuildGift(int eventId, string name, string? description, decimal price, int quantity)
    {
        return new Gift
        {
            EventId = eventId,
            Name = name.Trim(),
            Description = description?.Trim() ?? string.Empty,
            Price = price,
            Quantity = quantity,
            ReservedQuantity = 0
        };
    }
}
