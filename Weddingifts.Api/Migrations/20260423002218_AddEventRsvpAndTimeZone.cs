using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Weddingifts.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEventRsvpAndTimeZone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EventGuests_EventId",
                table: "EventGuests");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Gifts",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Gifts",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Events",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "CeremonyInfo",
                table: "Events",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CoverImageUrl",
                table: "Events",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DressCode",
                table: "Events",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "EventDateTime",
                table: "Events",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "HostNames",
                table: "Events",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LocationAddress",
                table: "Events",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LocationMapsUrl",
                table: "Events",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LocationName",
                table: "Events",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TimeZoneId",
                table: "Events",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE "Events"
                SET
                    "HostNames" = "Name",
                    "TimeZoneId" = 'America/Sao_Paulo',
                    "EventDateTime" = make_timestamptz(
                        EXTRACT(YEAR FROM "EventDate" AT TIME ZONE 'UTC')::integer,
                        EXTRACT(MONTH FROM "EventDate" AT TIME ZONE 'UTC')::integer,
                        EXTRACT(DAY FROM "EventDate" AT TIME ZONE 'UTC')::integer,
                        12,
                        0,
                        0,
                        'America/Sao_Paulo')
                WHERE "EventDateTime" = TIMESTAMPTZ '0001-01-01 00:00:00+00'
                  AND "TimeZoneId" = '';
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "EventGuests",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "EventGuests",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "DietaryRestrictions",
                table: "EventGuests",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxExtraGuests",
                table: "EventGuests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "MessageToCouple",
                table: "EventGuests",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RsvpRespondedAt",
                table: "EventGuests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RsvpStatus",
                table: "EventGuests",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.CreateTable(
                name: "EventGuestCompanions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventGuestId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Cpf = table.Column<string>(type: "character varying(11)", maxLength: 11, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventGuestCompanions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventGuestCompanions_EventGuests_EventGuestId",
                        column: x => x.EventGuestId,
                        principalTable: "EventGuests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EventGuestCompanions_EventGuestId",
                table: "EventGuestCompanions",
                column: "EventGuestId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventGuestCompanions");

            migrationBuilder.DropColumn(
                name: "CeremonyInfo",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "CoverImageUrl",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "DressCode",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "EventDateTime",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "HostNames",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "LocationAddress",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "LocationMapsUrl",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "LocationName",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "TimeZoneId",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "DietaryRestrictions",
                table: "EventGuests");

            migrationBuilder.DropColumn(
                name: "MaxExtraGuests",
                table: "EventGuests");

            migrationBuilder.DropColumn(
                name: "MessageToCouple",
                table: "EventGuests");

            migrationBuilder.DropColumn(
                name: "RsvpRespondedAt",
                table: "EventGuests");

            migrationBuilder.DropColumn(
                name: "RsvpStatus",
                table: "EventGuests");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Gifts",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Gifts",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Events",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "EventGuests",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "EventGuests",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.CreateIndex(
                name: "IX_EventGuests_EventId",
                table: "EventGuests",
                column: "EventId");
        }
    }
}
