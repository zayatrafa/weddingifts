using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

namespace Weddingifts.Api.Services;

public class GiftService
{
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
        ValidateCreateGiftRequest(eventId, request);

        var eventExists = await _context.Events.AnyAsync(e => e.Id == eventId);
        if (!eventExists)
            throw new ResourceNotFoundException("Event not found.");

        var gift = BuildGift(eventId, request);

        _context.Gifts.Add(gift);
        await _context.SaveChangesAsync();

        return gift;
    }

    public async Task<Gift> CreateGiftForUser(int eventId, int userId, CreateGiftRequest request)
    {
        ValidateCreateGiftRequest(eventId, request);

        if (userId <= 0)
            throw new DomainValidationException("Authenticated user id is invalid.");

        var ev = await _context.Events
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId);

        if (ev is null)
            throw new ResourceNotFoundException("Event not found.");

        if (ev.UserId != userId)
            throw new ForbiddenOperationException("You do not have permission to modify this event.");

        var gift = BuildGift(eventId, request);

        _context.Gifts.Add(gift);
        await _context.SaveChangesAsync();

        return gift;
    }

    public async Task<List<Gift>> GetGiftsByEvent(int eventId)
    {
        if (eventId <= 0)
            throw new DomainValidationException("EventId must be greater than zero.");

        var eventExists = await _context.Events.AnyAsync(e => e.Id == eventId);
        if (!eventExists)
            throw new ResourceNotFoundException("Event not found.");

        return await _context.Gifts
            .AsNoTracking()
            .Where(g => g.EventId == eventId)
            .OrderBy(g => g.Id)
            .ToListAsync();
    }

    public async Task<Gift> ReserveGift(int giftId, ReserveGiftRequest request)
    {
        if (giftId <= 0)
            throw new DomainValidationException("GiftId must be greater than zero.");

        var normalizedCpf = EventGuestService.NormalizeCpf(request.GuestCpf);

        var gift = await _context.Gifts.FirstOrDefaultAsync(g => g.Id == giftId);
        if (gift is null)
            throw new ResourceNotFoundException("Gift not found.");

        if (gift.Quantity <= 0)
            throw new DomainValidationException("Cannot reserve a gift with zero quantity.");

        if (gift.ReservedQuantity >= gift.Quantity)
            throw new DomainValidationException("Gift is already fully reserved.");

        var guestIsInvited = await _context.EventGuests
            .AnyAsync(g => g.EventId == gift.EventId && g.Cpf == normalizedCpf);

        if (!guestIsInvited)
            throw new DomainValidationException("CPF is not invited to this event.");

        gift.ReservedQuantity += 1;
        gift.ReservedBy = normalizedCpf;
        gift.ReservedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return gift;
    }

    public async Task<Gift> UnreserveGift(int giftId)
    {
        if (giftId <= 0)
            throw new DomainValidationException("GiftId must be greater than zero.");

        var gift = await _context.Gifts.FirstOrDefaultAsync(g => g.Id == giftId);
        if (gift is null)
            throw new ResourceNotFoundException("Gift not found.");

        if (gift.ReservedQuantity <= 0)
            throw new DomainValidationException("Gift has no active reservation.");

        gift.ReservedQuantity -= 1;

        if (gift.ReservedQuantity == 0)
        {
            gift.ReservedBy = null;
            gift.ReservedAt = null;
        }

        await _context.SaveChangesAsync();

        return gift;
    }

    private static void ValidateCreateGiftRequest(int eventId, CreateGiftRequest request)
    {
        if (eventId <= 0)
            throw new DomainValidationException("EventId must be greater than zero.");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new DomainValidationException("Gift name is required.");

        if (request.Price <= MinGiftPrice)
            throw new DomainValidationException("Price must be greater than zero.");

        if (request.Price >= MaxGiftPriceExclusive)
            throw new DomainValidationException("Price must be less than 1000000.");

        if (request.Quantity < MinGiftQuantity)
            throw new DomainValidationException("Quantity must be greater than or equal to 1.");

        if (request.Quantity > MaxGiftQuantity)
            throw new DomainValidationException("Quantity must be less than or equal to 100000.");
    }

    private static Gift BuildGift(int eventId, CreateGiftRequest request)
    {
        return new Gift
        {
            EventId = eventId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Price = request.Price,
            Quantity = request.Quantity,
            ReservedQuantity = 0
        };
    }
}
