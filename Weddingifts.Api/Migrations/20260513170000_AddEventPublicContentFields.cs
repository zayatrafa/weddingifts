using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Weddingifts.Api.Data;

#nullable disable

namespace Weddingifts.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260513170000_AddEventPublicContentFields")]
    public partial class AddEventPublicContentFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FoodInfo",
                table: "Events",
                type: "character varying(800)",
                maxLength: 800,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "GalleryImageUrls",
                table: "Events",
                type: "character varying(6000)",
                maxLength: 6000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ScheduleInfo",
                table: "Events",
                type: "character varying(800)",
                maxLength: 800,
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FoodInfo",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "GalleryImageUrls",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "ScheduleInfo",
                table: "Events");
        }
    }
}
