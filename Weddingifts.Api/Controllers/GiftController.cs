using Microsoft.AspNetCore.Mvc;
using Weddingifts.Api.Models;
using Weddingifts.Api.Services;

namespace Weddingifts.Api.Controllers;

[ApiController]
[Route("api/events")]
public class GiftController : ControllerBase
{
    private readonly GiftService _giftService;

    public GiftController(GiftService giftService)
    {
        _giftService = giftService;
    }

    [HttpPost("{eventId}/gifts")]
    public async Task<IActionResult> CreateGift(int eventId, CreateGiftRequest request)
    {
        var gift = await _giftService.CreateGift(eventId, request);

        return Ok(gift);
    }

    [HttpGet("{eventId}/gifts")]
    public async Task<IActionResult> GetGifts(int eventId)
    {
        var gifts = await _giftService.GetGiftsByEvent(eventId);

        return Ok(gifts);
    }
}