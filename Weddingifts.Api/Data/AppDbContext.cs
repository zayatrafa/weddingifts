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
    public DbSet<EventGuestCompanion> EventGuestCompanions => Set<EventGuestCompanion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Event>()
            .Property(e => e.Name)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<Event>()
            .Property(e => e.HostNames)
            .HasMaxLength(160)
            .IsRequired();

        modelBuilder.Entity<Event>()
            .Property(e => e.TimeZoneId)
            .HasMaxLength(64)
            .IsRequired();

        modelBuilder.Entity<Event>()
            .Property(e => e.LocationName)
            .HasMaxLength(160)
            .IsRequired();

        modelBuilder.Entity<Event>()
            .Property(e => e.LocationAddress)
            .HasMaxLength(255)
            .IsRequired();

        modelBuilder.Entity<Event>()
            .Property(e => e.LocationMapsUrl)
            .HasMaxLength(500)
            .IsRequired();

        modelBuilder.Entity<Event>()
            .Property(e => e.CeremonyInfo)
            .HasMaxLength(500)
            .IsRequired();

        modelBuilder.Entity<Event>()
            .Property(e => e.DressCode)
            .HasMaxLength(160)
            .IsRequired();

        modelBuilder.Entity<Event>()
            .Property(e => e.CoverImageUrl)
            .HasMaxLength(500)
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
            .Property(g => g.RsvpStatus)
            .HasConversion<string>()
            .HasMaxLength(16)
            .IsRequired();

        modelBuilder.Entity<EventGuest>()
            .Property(g => g.MessageToCouple)
            .HasMaxLength(500);

        modelBuilder.Entity<EventGuest>()
            .Property(g => g.DietaryRestrictions)
            .HasMaxLength(500);

        modelBuilder.Entity<EventGuest>()
            .HasIndex(g => new { g.EventId, g.Cpf })
            .IsUnique();

        modelBuilder.Entity<EventGuestCompanion>()
            .Property(c => c.Name)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<EventGuestCompanion>()
            .Property(c => c.Cpf)
            .HasMaxLength(11);

        modelBuilder.Entity<EventGuestCompanion>()
            .HasIndex(c => c.EventGuestId);
        
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

        modelBuilder.Entity<EventGuestCompanion>()
            .HasOne(c => c.EventGuest)
            .WithMany(g => g.Companions)
            .HasForeignKey(c => c.EventGuestId)
            .OnDelete(DeleteBehavior.Cascade);

    }
}
