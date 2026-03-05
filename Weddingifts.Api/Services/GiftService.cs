using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Data;
using Weddingifts.Api.Entities;
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
        var gift = new Gift
        {
            EventId = eventId,
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            Quantity = request.Quantity
        };

        _context.Gifts.Add(gift);

        await _context.SaveChangesAsync();

        return gift;
    }

    public async Task<List<Gift>> GetGiftsByEvent(int eventId)
    {
        return await _context.Gifts
            .Where(g => g.EventId == eventId)
            .ToListAsync();
    }
}