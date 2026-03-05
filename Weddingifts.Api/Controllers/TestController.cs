using Microsoft.AspNetCore.Mvc;
using Weddingifts.Api.Data;

namespace Weddingifts.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    public TestController(AppDbContext context)
    {
        Console.WriteLine(">>> TestController foi criado");
    }

    [HttpGet]
    public IActionResult Get()
    {
        Console.WriteLine(">>> Endpoint foi chamado");
        return Ok("Funcionando");
    }
}