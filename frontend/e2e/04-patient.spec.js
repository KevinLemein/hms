import { test, expect } from "@playwright/test";
import { fixtures, signIn } from "./helpers.js";

test.describe("Patient", () => {
    test.beforeEach(async ({ page }) => {
        await signIn(page, fixtures().zawadi);
        await expect(page).toHaveURL(/\/patient$/);
    });

    test("sees their profile, appointments, prescriptions and bills", async ({ page }) => {
        await expect(page.getByRole("heading", { name: "Welcome, Zawadi" })).toBeVisible();
        await expect(page.getByText("Penicillin")).toBeVisible(); // allergies are prominent

        await page.getByRole("tab", { name: "Appointments" }).click();
        await expect(page.getByRole("table", { name: "Your appointments" }).getByText("Dr. Amani Kamau")).toBeVisible();

        await page.getByRole("tab", { name: "Prescriptions" }).click();
        const rx = page.getByRole("table", { name: "Your prescriptions" });
        await expect(rx.getByText("Amoxicillin")).toBeVisible();
        await expect(rx.getByText("Dr. Amani Kamau")).toBeVisible();

        await page.getByRole("tab", { name: "Bills" }).click();
        const bill = page.getByRole("article").first();
        // Consultation was paid by M-Pesa; medication was added afterwards.
        await expect(bill.getByText("Partially paid")).toBeVisible();
        await expect(bill.getByText("Consultation Fee")).toBeVisible();
        await expect(bill.getByText(/Amoxicillin/)).toBeVisible();
        await expect(bill.getByText("Ref QAB1E2E001")).toBeVisible();
        await expect(page.getByText("You have a balance due.")).toBeVisible();
    });
});
