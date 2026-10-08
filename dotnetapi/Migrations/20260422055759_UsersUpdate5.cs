using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediCare.Migrations
{
    /// <inheritdoc />
    public partial class UsersUpdate5 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "dossage",
                table: "prescriptions",
                type: "text",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "notes",
                table: "prescriptions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "quantity",
                table: "prescriptions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "cost",
                table: "drugs",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "quantity",
                table: "drugs",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "notes",
                table: "prescriptions");

            migrationBuilder.DropColumn(
                name: "quantity",
                table: "prescriptions");

            migrationBuilder.DropColumn(
                name: "cost",
                table: "drugs");

            migrationBuilder.DropColumn(
                name: "quantity",
                table: "drugs");

            migrationBuilder.AlterColumn<int>(
                name: "dossage",
                table: "prescriptions",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
