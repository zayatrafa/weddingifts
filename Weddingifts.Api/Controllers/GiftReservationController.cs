using Microsoft.AspNetCore.Mvc;
using Weddingifts.Api.Models;
using Weddingifts.Api.Services;

namespace Weddingifts.Api.Controllers;

[ApiController]
[Route("api/gifts")]
public class GiftReservationController : ControllerBase
{
    private readonly GiftService _giftService;

    public GiftReservationController(GiftService giftService)
    {
        _giftService = giftService;
    }

    [HttpPost("{giftId:int}/reserve")]
    public async Task<IActionResult> ReserveGift(int giftId, [FromBody] ReserveGiftRequest? request)
    {
        var gift = await _giftService.ReserveGift(giftId, request ?? new ReserveGiftRequest());
        var response = GiftResponse.FromEntity(gift);

        return Ok(response);
    }

    [HttpPost("{giftId:int}/unreserve")]
    public async Task<IActionResult> UnreserveGift(int giftId)
    {
        var gift = await _giftService.UnreserveGift(giftId);
        var response = GiftResponse.FromEntity(gift);

        return Ok(response);
    }
}
