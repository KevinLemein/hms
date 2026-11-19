using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MediCare.Migrations
{
    /// <inheritdoc />
    public partial class payments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "middle_name",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)");

            migrationBuilder.AlterColumn<string>(
                name: "last_name",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)");

            migrationBuilder.AlterColumn<string>(
                name: "first_name",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)");

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    date_paid = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    appointment_id = table.Column<int>(type: "integer", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric", nullable: false),
                    transaction_code = table.Column<string>(type: "text", nullable: false),
                    created_on = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_id = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_payments", x => x.id);
                    table.ForeignKey(
                        name: "fk_payments_appointments_appointment_id",
                        column: x => x.appointment_id,
                        principalTable: "appointments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_payments_users_created_by_id",
                        column: x => x.created_by_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_doctors_speciality_id",
                table: "doctors",
                column: "speciality_id");

            migrationBuilder.CreateIndex(
                name: "ix_payments_appointment_id",
                table: "payments",
                column: "appointment_id");

            migrationBuilder.CreateIndex(
                name: "ix_payments_created_by_id",
                table: "payments",
                column: "created_by_id");

            migrationBuilder.AddForeignKey(
                name: "fk_doctors_specialities_speciality_id",
                table: "doctors",
                column: "speciality_id",
                principalTable: "specialities",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_doctors_specialities_speciality_id",
                table: "doctors");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropIndex(
                name: "ix_doctors_speciality_id",
                table: "doctors");

            migrationBuilder.AlterColumn<string>(
                name: "middle_name",
                table: "AspNetUsers",
                type: "nvarchar(100)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "last_name",
                table: "AspNetUsers",
                type: "nvarchar(100)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "first_name",
                table: "AspNetUsers",
                type: "nvarchar(100)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
