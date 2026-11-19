import { test, expect } from "@playwright/test";
import { expectToast, fixtures, signIn, sql } from "./helpers.js";

test.describe.configure({ mode: "serial" });

/** Select a <option> whose text matches (selectOption doesn't take a regex label). */
async function chooseMedication(dialog, pattern) {
    const value = await dialog.getByRole("option", { name: pattern }).getAttribute("value");
    await dialog.getByLabel("Medication").selectOption(value);
}

const PRICE_KEYS = ["unitPrice", "price", "cost", "totalPrice", "chargeAmount", "amount"];

test.describe("Doctor", () => {
    test.beforeEach(async ({ page }) => {
        await signIn(page, fixtures().doctor);
        await expect(page).toHaveURL(/\/doctor$/);
    });

    test("sees only their queue, starts the consultation and prescribes; the server prices the charge", async ({ page }) => {
        const billRequests = [];
        page.on("request", (r) => { if (r.url().includes("/api/bills") && r.method() !== "GET") billRequests.push(r.url()); });

        const queue = page.getByRole("tabpanel");
        await expect(queue.getByText("Zawadi Njeri")).toBeVisible();
        await queue.getByRole("button", { name: "Start consultation: Zawadi Njeri" }).click();
        await expectToast(page, "Zawadi Njeri: In consultation");

        await queue.getByRole("button", { name: "Prescribe" }).click();
        const dialog = page.getByRole("dialog", { name: "Prescribe medication" });
        await chooseMedication(dialog, /Amoxicillin/);
        await dialog.getByLabel("Dosage").fill("1 capsule");
        await dialog.getByLabel("Duration").fill("3 times a day for 5 days");
        await dialog.getByLabel("Quantity to dispense").fill("3");
        await expect(dialog.getByText(/Estimated charge/)).toContainText("360.00");

        const request = page.waitForRequest((r) => r.url().endsWith("/api/prescriptions") && r.method() === "POST");
        await dialog.getByRole("button", { name: "Prescribe and dispense" }).click();
        const body = (await request).postDataJSON();
        for (const key of PRICE_KEYS) expect(body, `request must not carry "${key}"`).not.toHaveProperty(key);

        await expectToast(page, /360\.00 added to the bill/);
        expect(billRequests, "the browser must not create bills or charges").toEqual([]);
    });

    test("re-submitting the same prescription does not dispense or charge again", async ({ page }) => {
        const before = sql("SELECT quantity FROM drugs WHERE name = 'Amoxicillin'");
        await page.getByRole("tabpanel").getByRole("button", { name: "Prescribe" }).click();
        const dialog = page.getByRole("dialog", { name: "Prescribe medication" });
        await chooseMedication(dialog, /Amoxicillin/);
        await dialog.getByLabel("Dosage").fill("1 capsule");
        await dialog.getByLabel("Duration").fill("3 times a day for 5 days");
        await dialog.getByLabel("Quantity to dispense").fill("3");
        await dialog.getByRole("button", { name: "Prescribe and dispense" }).click();

        await expectToast(page, "already recorded");
        expect(sql("SELECT quantity FROM drugs WHERE name = 'Amoxicillin'")).toBe(before);
        expect(sql("SELECT COUNT(*) FROM bill_line_items WHERE source = 'DRUG_DISPENSE'")).toBe("1");
    });

    test("insufficient stock is reported clearly and nothing is dispensed", async ({ page }) => {
        await page.getByRole("tabpanel").getByRole("button", { name: "Prescribe" }).click();
        const dialog = page.getByRole("dialog", { name: "Prescribe medication" });
        await chooseMedication(dialog, /Paracetamol/);
        await dialog.getByLabel("Dosage").fill("2 tablets");
        await dialog.getByLabel("Duration").fill("When needed");

        // The form blocks more than the stock it knows about...
        await dialog.getByLabel("Quantity to dispense").fill("5");
        await dialog.getByRole("button", { name: "Prescribe and dispense" }).click();
        await expect(dialog.getByText("Only 2 in stock.")).toBeVisible();

        // ...and the server is the final check when stock changed meanwhile.
        sql("UPDATE drugs SET quantity = 1 WHERE name = 'Paracetamol'");
        await dialog.getByLabel("Quantity to dispense").fill("2");
        await dialog.getByRole("button", { name: "Prescribe and dispense" }).click();
        await expect(dialog.getByRole("alert")).toContainText("Insufficient stock for Paracetamol");
        expect(sql("SELECT quantity FROM drugs WHERE name = 'Paracetamol'")).toBe("1");
        await page.keyboard.press("Escape");
    });

    test("unpriced medication can't be chosen", async ({ page }) => {
        await page.getByRole("tabpanel").getByRole("button", { name: "Prescribe" }).click();
        const option = page.getByRole("dialog").getByRole("option", { name: /Unpriced Syrup/ });
        await expect(option).toBeDisabled();
        await page.keyboard.press("Escape");
    });

    test("completes the visit", async ({ page }) => {
        const queue = page.getByRole("tabpanel");
        await queue.getByRole("button", { name: "Complete visit: Zawadi Njeri" }).click();
        await expectToast(page, "Zawadi Njeri: Completed");
        await page.getByRole("tab", { name: "Prescriptions" }).click();
        await expect(page.getByRole("table", { name: "Prescriptions I've issued" }).getByText("Amoxicillin 500 mg")).toBeVisible();
    });
});
