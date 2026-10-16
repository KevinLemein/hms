import { test, expect } from "@playwright/test";
import { expectToast, fixtures, localDateTime, signIn } from "./helpers.js";

test.describe.configure({ mode: "serial" });

test.describe("Receptionist", () => {
    test.beforeEach(async ({ page }) => {
        await signIn(page, fixtures().receptionist);
        await expect(page).toHaveURL(/\/receptionist$/);
    });

    test("registers a patient, books the first visit and shows the one-time password", async ({ page }) => {
        await page.getByRole("tab", { name: "Register patient" }).click();
        await page.getByLabel("First name").fill("Neema");
        await page.getByLabel("Last name").fill("Wairimu");
        await page.getByLabel("Email").fill("neema.e2e@example.test");
        await page.getByRole("textbox", { name: "Phone", exact: true }).fill("0700500600");
        await page.getByLabel("Date of birth").fill("1995-02-02");
        await page.getByLabel("Address").fill("Nakuru");
        await page.getByLabel("Doctor").selectOption({ label: "Dr. Amani Kamau" });
        await page.getByLabel("Date and time").fill(localDateTime(2, 9));
        await page.getByRole("button", { name: "Register and book" }).click();

        const dialog = page.getByRole("dialog", { name: "Patient registered" });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText("Temporary password")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
    });

    test("required fields are flagged before anything is sent", async ({ page }) => {
        await page.getByRole("tab", { name: "Book appointment" }).click();
        await page.getByRole("button", { name: "Book appointment" }).click();
        await expect(page.getByText("Select a patient.")).toBeVisible();
        await expect(page.getByText("Select a doctor.")).toBeVisible();
        await expect(page.getByText("Choose a date and time.")).toBeVisible();
    });

    test("books an appointment and gets a clear conflict for a taken slot", async ({ page }) => {
        const slot = localDateTime(1, 10);
        const book = async (search, name) => {
            await page.getByRole("tab", { name: "Book appointment" }).click();
            await page.getByRole("combobox", { name: /Patient/ }).fill(search);
            await page.getByRole("option", { name: new RegExp(name) }).click();
            await page.getByLabel("Doctor").selectOption({ label: "Dr. Amani Kamau" });
            await page.getByLabel("Date and time").fill(slot);
            await page.getByRole("button", { name: "Book appointment" }).click();
        };

        await book("Jabari", "Jabari Ochieng");
        await expectToast(page, "Appointment booked for Jabari Ochieng");

        await book("Zawadi", "Zawadi Njeri");
        await expect(page.getByRole("alert").filter({ hasText: "already has an appointment at this time" })).toBeVisible();
    });

    test("checks a patient in, and cancelling asks for confirmation", async ({ page }) => {
        await page.getByRole("tab", { name: "Appointments" }).click();
        const table = page.getByRole("table", { name: "Appointments" });

        await table.getByRole("button", { name: "Check in: Jabari Ochieng" }).first().click();
        await expectToast(page, "Jabari Ochieng: Waiting");
        await expect(table.getByRole("row", { name: /Jabari Ochieng/ }).first().getByText("Waiting")).toBeVisible();

        // Tomorrow's booking (from the previous test) appears under "All".
        await page.getByRole("button", { name: "All", pressed: false }).click();
        const cancel = table.getByRole("button", { name: "Cancel: Jabari Ochieng" }).first();
        await cancel.click();
        const confirm = page.getByRole("dialog", { name: /Cancel — Jabari Ochieng/ });
        await expect(confirm).toBeVisible();
        await page.keyboard.press("Escape"); // backing out changes nothing
        await expect(confirm).toBeHidden();
        await expect(cancel).toBeFocused(); // focus returns to the trigger

        await cancel.click();
        await confirm.getByRole("button", { name: "Cancel" }).click();
        await expectToast(page, "Jabari Ochieng: Cancelled");
    });

    test("records an M-Pesa payment and rejects a reused transaction code", async ({ page }) => {
        await page.getByRole("tab", { name: "Billing" }).click();

        const zawadiBill = page.getByRole("article").filter({ hasText: "Zawadi Njeri" }).first();
        await expect(zawadiBill.getByText("Consultation Fee")).toBeVisible();
        await zawadiBill.getByRole("button", { name: "Record payment" }).click();
        let dialog = page.getByRole("dialog", { name: "Record a payment" });
        await dialog.getByText("M-Pesa").click();
        await dialog.getByLabel("M-Pesa transaction code").fill("QAB1E2E001");
        await dialog.getByRole("button", { name: /^Record/ }).click();
        await expectToast(page, "Payment of");
        await expect(zawadiBill.getByText("Ref QAB1E2E001")).toBeVisible();

        const jabariBill = page.getByRole("article").filter({ hasText: "Jabari Ochieng" }).first();
        await jabariBill.getByRole("button", { name: "Record payment" }).click();
        dialog = page.getByRole("dialog", { name: "Record a payment" });
        await dialog.getByText("M-Pesa").click();
        await dialog.getByLabel("M-Pesa transaction code").fill("QAB1E2E001");
        await dialog.getByRole("button", { name: /^Record/ }).click();
        await expect(dialog.getByRole("alert")).toContainText("already been recorded");
        await dialog.getByRole("button", { name: "Cancel" }).click();
    });

    test("adds a manual charge (sent as MANUAL, never as a consultation or medication charge)", async ({ page }) => {
        await page.getByRole("tab", { name: "Billing" }).click();
        const bill = page.getByRole("article").filter({ hasText: "Jabari Ochieng" }).first();
        await bill.getByRole("button", { name: "Add charge" }).click();
        const dialog = page.getByRole("dialog", { name: "Add a charge" });
        await dialog.getByRole("button", { name: /Injection fee/ }).click();

        const request = page.waitForRequest((r) => r.url().includes("/items") && r.method() === "POST");
        await dialog.getByRole("button", { name: /^Add charge/ }).click();
        expect((await request).postDataJSON().source).toBe("MANUAL");
        await expectToast(page, "Charge added");
        await expect(bill.getByText("Injection fee")).toBeVisible();
    });
});
