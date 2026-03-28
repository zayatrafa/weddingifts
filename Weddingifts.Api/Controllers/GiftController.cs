using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Weddingifts.Api.Exceptions;
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

    [Authorize]
    [HttpPost("{eventId:int}/gifts")]
    public async Task<IActionResult> CreateGift(int eventId, [FromBody] CreateGiftRequest request)
    {
        var userId = GetAuthenticatedUserId();
        var gift = await _giftService.CreateGiftForUser(eventId, userId, request);
        var response = GiftResponse.FromEntity(gift);

        return Created($"/api/events/{eventId}/gifts/{response.Id}", response);
    }

    [Authorize]
    [HttpPut("{eventId:int}/gifts/{giftId:int}")]
    public async Task<IActionResult> UpdateGift(int eventId, int giftId, [FromBody] UpdateGiftRequest request)
    {
        var userId = GetAuthenticatedUserId();
        var gift = await _giftService.UpdateGiftForUser(eventId, giftId, userId, request);
        var response = GiftResponse.FromEntity(gift);

        return Ok(response);
    }

    [Authorize]
    [HttpDelete("{eventId:int}/gifts/{giftId:int}")]
    public async Task<IActionResult> DeleteGift(int eventId, int giftId)
    {
        var userId = GetAuthenticatedUserId();
        await _giftService.DeleteGiftForUser(eventId, giftId, userId);

        return NoContent();
    }

    [AllowAnonymous]
    [HttpGet("{eventId:int}/gifts")]
    public async Task<IActionResult> GetGifts(int eventId)
    {
        var gifts = await _giftService.GetGiftsByEvent(eventId);
        var response = gifts.Select(GiftResponse.FromEntity);

        return Ok(response);
    }

    private int GetAuthenticatedUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(claim, out var userId) || userId <= 0)
        {
            throw new DomainValidationException("Id do usuário autenticado é inválido.");
        }

        return userId;
    }
}
