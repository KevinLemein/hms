import { test, expect } from "@playwright/test";
import { fixtures, signIn } from "./helpers.js";

test.describe("Keyboard and small-screen behaviour", () => {
    test("skip link moves focus to the main content", async ({ page }) => {
        await signIn(page, fixtures().receptionist);
        await expect(page).toHaveURL(/\/receptionist$/);
        await page.keyboard.press("Tab");
        const skip = page.getByRole("link", { name: "Skip to main content" });
        await expect(skip).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.locator("#main-content")).toBeFocused();
    });

    test("tabs follow the ARIA pattern (arrow keys, aria-selected)", async ({ page }) => {
        await signIn(page, fixtures().receptionist);
        const overview = page.getByRole("tab", { name: "Overview" });
        await overview.focus();
        await page.keyboard.press("ArrowRight");
        const appointments = page.getByRole("tab", { name: "Appointments" });
        await expect(appointments).toBeFocused();
        await expect(appointments).toHaveAttribute("aria-selected", "true");
        await expect(overview).toHaveAttribute("aria-selected", "false");
        await page.keyboard.press("End");
        await expect(page.getByRole("tab", { name: "Billing" })).toHaveAttribute("aria-selected", "true");
    });

    test("dialogs keep focus inside and close with Escape", async ({ page }) => {
        await signIn(page, fixtures().admin);
        const trigger = page.getByRole("button", { name: "Create staff account" });
        await trigger.click();
        const dialog = page.getByRole("dialog", { name: "Create staff account" });
        await expect(dialog.getByLabel("First name")).toBeFocused();
        for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
        expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test("lists fit a phone screen without sideways scrolling", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 800 });
        await signIn(page, fixtures().receptionist);
        await page.getByRole("tab", { name: "Appointments" }).click();
        await page.getByRole("button", { name: "All", pressed: false }).click();
        await expect(page.getByRole("list", { name: "Appointments" })).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
    });
});
