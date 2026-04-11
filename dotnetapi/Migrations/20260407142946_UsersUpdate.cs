using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MediCare.Migrations
{
    /// <inheritdoc />
    public partial class UsersUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_appointment_status_users_created_by_id",
                table: "appointment_status");

            migrationBuilder.DropForeignKey(
                name: "fk_appointments_users_created_by_id",
                table: "appointments");

            migrationBuilder.DropForeignKey(
                name: "fk_doctors_users_created_by_id",
                table: "doctors");

            migrationBuilder.DropForeignKey(
                name: "fk_doctors_users_user_id",
                table: "doctors");

            migrationBuilder.DropForeignKey(
                name: "fk_medical_records_users_created_by_id",
                table: "medical_records");

            migrationBuilder.DropForeignKey(
                name: "fk_patient_users_created_by_id",
                table: "patient");

            migrationBuilder.DropForeignKey(
                name: "fk_payments_users_created_by_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "dossage",
                table: "medical_records");

            migrationBuilder.DropColumn(
                name: "first_name",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "last_name",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "middle_name",
                table: "AspNetUsers");

            migrationBuilder.RenameColumn(
                name: "duration",
                table: "medical_records",
                newName: "diagnosis");

            migrationBuilder.AddColumn<int>(
                name: "drug_id",
                table: "prescriptions",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<long>(
                name: "created_by_id",
                table: "payments",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<long>(
                name: "created_by_id",
                table: "patient",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<long>(
                name: "created_by_id",
                table: "medical_records",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<long>(
                name: "user_id",
                table: "doctors",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<long>(
                name: "created_by_id",
                table: "doctors",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<long>(
                name: "created_by_id",
                table: "appointments",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<long>(
                name: "created_by_id",
                table: "appointment_status",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    first_name = table.Column<string>(type: "text", nullable: false),
                    last_name = table.Column<string>(type: "text", nullable: false),
                    password = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    username = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_prescriptions_drug_id",
                table: "prescriptions",
                column: "drug_id");

            migrationBuilder.AddForeignKey(
                name: "fk_appointment_status_users_created_by_id",
                table: "appointment_status",
                column: "created_by_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_appointments_users_created_by_id",
                table: "appointments",
                column: "created_by_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_doctors_users_created_by_id",
                table: "doctors",
                column: "created_by_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_doctors_users_user_id",
                table: "doctors",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_medical_records_users_created_by_id",
                table: "medical_records",
                column: "created_by_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_patient_users_created_by_id",
                table: "patient",
                column: "created_by_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_payments_users_created_by_id",
                table: "payments",
                column: "created_by_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_prescriptions_drugs_drug_id",
                table: "prescriptions",
                column: "drug_id",
                principalTable: "drugs",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_appointment_status_users_created_by_id",
                table: "appointment_status");

            migrationBuilder.DropForeignKey(
                name: "fk_appointments_users_created_by_id",
                table: "appointments");

            migrationBuilder.DropForeignKey(
                name: "fk_doctors_users_created_by_id",
                table: "doctors");

            migrationBuilder.DropForeignKey(
                name: "fk_doctors_users_user_id",
                table: "doctors");

            migrationBuilder.DropForeignKey(
                name: "fk_medical_records_users_created_by_id",
                table: "medical_records");

            migrationBuilder.DropForeignKey(
                name: "fk_patient_users_created_by_id",
                table: "patient");

            migrationBuilder.DropForeignKey(
                name: "fk_payments_users_created_by_id",
                table: "payments");

            migrationBuilder.DropForeignKey(
                name: "fk_prescriptions_drugs_drug_id",
                table: "prescriptions");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropIndex(
                name: "ix_prescriptions_drug_id",
                table: "prescriptions");

            migrationBuilder.DropColumn(
                name: "drug_id",
                table: "prescriptions");

            migrationBuilder.RenameColumn(
                name: "diagnosis",
                table: "medical_records",
                newName: "duration");

            migrationBuilder.AlterColumn<string>(
                name: "created_by_id",
                table: "payments",
                type: "text",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<string>(
                name: "created_by_id",
                table: "patient",
                type: "text",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<string>(
                name: "created_by_id",
                table: "medical_records",
                type: "text",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<int>(
                name: "dossage",
                table: "medical_records",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "user_id",
                table: "doctors",
                type: "text",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<string>(
                name: "created_by_id",
                table: "doctors",
                type: "text",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<string>(
                name: "first_name",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "last_name",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "middle_name",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "created_by_id",
                table: "appointments",
                type: "text",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AlterColumn<string>(
                name: "created_by_id",
                table: "appointment_status",
                type: "text",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddForeignKey(
                name: "fk_appointment_status_users_created_by_id",
                table: "appointment_status",
                column: "created_by_id",
                principalTable: "AspNetUsers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_appointments_users_created_by_id",
                table: "appointments",
                column: "created_by_id",
                principalTable: "AspNetUsers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_doctors_users_created_by_id",
                table: "doctors",
                column: "created_by_id",
                principalTable: "AspNetUsers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_doctors_users_user_id",
                table: "doctors",
                column: "user_id",
                principalTable: "AspNetUsers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_medical_records_users_created_by_id",
                table: "medical_records",
                column: "created_by_id",
                principalTable: "AspNetUsers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_patient_users_created_by_id",
                table: "patient",
                column: "created_by_id",
                principalTable: "AspNetUsers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_payments_users_created_by_id",
                table: "payments",
                column: "created_by_id",
                principalTable: "AspNetUsers",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
