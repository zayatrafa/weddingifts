using Microsoft.EntityFrameworkCore;
using Weddingifts.Api.Entities;

namespace Weddingifts.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
        Console.WriteLine(">>> AppDbContext foi instanciado");
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Gift> Gifts => Set<Gift>();
}