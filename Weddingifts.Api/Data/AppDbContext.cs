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
    public DbSet<GiftReservation> GiftReservations => Set<GiftReservation>();
    public DbSet<EventGuest> EventGuests => Set<EventGuest>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Event>()
            .Property(e => e.Name)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<Gift>()
            .Property(g => g.Name)
            .HasMaxLength(255)
            .IsRequired();
        
        modelBuilder.Entity<Gift>()
            .Property(g => g.Description)
            .HasMaxLength(120);

        modelBuilder.Entity<GiftReservation>()
            .Property(r => r.GuestCpf)
            .HasMaxLength(11)
            .IsRequired();

        modelBuilder.Entity<GiftReservation>()
            .HasIndex(r => new { r.GiftId, r.GuestCpf });

        modelBuilder.Entity<GiftReservation>()
            .HasIndex(r => new { r.EventId, r.GuestCpf });

        modelBuilder.Entity<EventGuest>()
            .Property(g => g.Name)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<EventGuest>()
            .Property(g => g.Email)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<EventGuest>()
            .HasIndex(g => new { g.EventId, g.Cpf })
            .IsUnique();
        
        // User modelBuilder
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Cpf)
            .IsUnique()
            .HasFilter("\"Cpf\" IS NOT NULL");

        modelBuilder.Entity<User>()
            .Property(u => u.Email)
            .HasMaxLength(255)
            .IsRequired();
        
        modelBuilder.Entity<GiftReservation>()
            .HasOne(r => r.Event)
            .WithMany(e => e.GiftReservations)
            .HasForeignKey(r => r.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<GiftReservation>()
            .HasOne(r => r.Gift)
            .WithMany(g => g.Reservations)
            .HasForeignKey(r => r.GiftId)
            .OnDelete(DeleteBehavior.Cascade);

    }
}
