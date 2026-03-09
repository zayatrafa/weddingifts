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

    [HttpPost("{eventId:int}/gifts")]
    public async Task<IActionResult> CreateGift(int eventId, [FromBody] CreateGiftRequest request)
    {
        var gift = await _giftService.CreateGift(eventId, request);
        var response = GiftResponse.FromEntity(gift);

        return Created($"/api/events/{eventId}/gifts/{response.Id}", response);
    }

    [HttpGet("{eventId:int}/gifts")]
    public async Task<IActionResult> GetGifts(int eventId)
    {
        var gifts = await _giftService.GetGiftsByEvent(eventId);
        var response = gifts.Select(GiftResponse.FromEntity);

        return Ok(response);
    }
}
