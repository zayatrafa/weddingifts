using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using Weddingifts.Api.Data;

#nullable disable

namespace Weddingifts.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260403000100_AddGiftReservations")]
    public partial class AddGiftReservations : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GiftReservations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventId = table.Column<int>(type: "integer", nullable: false),
                    GiftId = table.Column<int>(type: "integer", nullable: false),
                    GuestCpf = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: false),
                    ReservedQuantity = table.Column<int>(type: "integer", nullable: false),
                    UnreservedQuantity = table.Column<int>(type: "integer", nullable: false),
                    ReservedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastReservedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastUnreservedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UnreservedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GiftReservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GiftReservations_Events_EventId",
                        column: x => x.EventId,
                        principalTable: "Events",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GiftReservations_Gifts_GiftId",
                        column: x => x.GiftId,
                        principalTable: "Gifts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GiftReservations_EventId_GuestCpf",
                table: "GiftReservations",
                columns: new[] { "EventId", "GuestCpf" });

            migrationBuilder.CreateIndex(
                name: "IX_GiftReservations_GiftId",
                table: "GiftReservations",
                column: "GiftId");

            migrationBuilder.CreateIndex(
                name: "IX_GiftReservations_GiftId_GuestCpf",
                table: "GiftReservations",
                columns: new[] { "GiftId", "GuestCpf" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GiftReservations");
        }
    }
}
