using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Weddingifts.Api.Data;

#nullable disable

namespace Weddingifts.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260309123000_AddGiftReservationFields")]
    public partial class AddGiftReservationFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Gifts\" ADD COLUMN IF NOT EXISTS \"ReservedAt\" timestamp with time zone NULL;");
            migrationBuilder.Sql("ALTER TABLE \"Gifts\" ADD COLUMN IF NOT EXISTS \"ReservedBy\" text NULL;");
            migrationBuilder.Sql("ALTER TABLE \"Gifts\" ADD COLUMN IF NOT EXISTS \"ReservedQuantity\" integer NOT NULL DEFAULT 0;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Gifts\" DROP COLUMN IF EXISTS \"ReservedAt\";");
            migrationBuilder.Sql("ALTER TABLE \"Gifts\" DROP COLUMN IF EXISTS \"ReservedBy\";");
            migrationBuilder.Sql("ALTER TABLE \"Gifts\" DROP COLUMN IF EXISTS \"ReservedQuantity\";");
        }
    }
}
