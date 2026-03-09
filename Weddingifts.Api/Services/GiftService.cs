using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
using Weddingifts.Api.Exceptions;
using Weddingifts.Api.Models;

namespace Weddingifts.Api.Services;

public class GiftService
{
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

        var gift = await _context.Gifts.FirstOrDefaultAsync(g => g.Id == giftId);
        if (gift is null)
            throw new ResourceNotFoundException("Gift not found.");

        if (gift.Quantity <= 0)
            throw new DomainValidationException("Cannot reserve a gift with zero quantity.");

        if (gift.ReservedQuantity >= gift.Quantity)
            throw new DomainValidationException("Gift is already fully reserved.");

        gift.ReservedQuantity += 1;
        gift.ReservedBy = string.IsNullOrWhiteSpace(request.GuestName)
            ? "Convidado"
            : request.GuestName.Trim();
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

        if (request.Price < 0)
            throw new DomainValidationException("Price must be greater than or equal to zero.");

        if (request.Quantity < 1)
            throw new DomainValidationException("Quantity must be greater than or equal to 1.");
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
