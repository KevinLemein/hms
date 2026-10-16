import { test, expect } from "@playwright/test";
import { fixtures, signIn } from "./helpers.js";

test.describe("Authentication and access", () => {
    test("each role signs in to its own dashboard", async ({ page }) => {
        const f = fixtures();
        const cases = [
            [f.admin, /\/admin$/, "User management"],
            [f.receptionist, /\/receptionist$/, "Reception"],
            [f.doctor, /\/doctor$/, "Dr. Kamau"],
            [f.zawadi, /\/patient$/, "Welcome, Zawadi"],
        ];
        for (const [account, url, heading] of cases) {
            await signIn(page, account);
            await expect(page).toHaveURL(url);
            await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
            await page.getByRole("button", { name: "Sign out" }).click();
            await expect(page).toHaveURL(/\/login$/);
        }
    });

    test("wrong password shows a clear error and stays on sign-in", async ({ page }) => {
        await signIn(page, { email: fixtures().receptionist.email, password: "not-the-password" });
        await expect(page.getByRole("alert")).toHaveText("Incorrect email or password.");
        await expect(page).toHaveURL(/\/login$/);
    });

    test("a protected page without a session goes to sign-in", async ({ page }) => {
        await page.goto("/receptionist");
        await expect(page).toHaveURL(/\/login$/);
    });

    test("an invalid or expired token (API 401) ends the session", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem("token", "expired.or.invalid");
            localStorage.setItem("user", JSON.stringify({ id: 1, role: "ROLE_RECEPTIONIST", username: "someone" }));
        });
        await page.goto("/receptionist");
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByText("Your session expired. Please sign in again.")).toBeVisible();
    });

    test("a signed-in user without permission sees access denied (route guard)", async ({ page }) => {
        await signIn(page, fixtures().zawadi);
        await expect(page).toHaveURL(/\/patient$/);
        await page.goto("/receptionist");
        await expect(page.getByRole("heading", { name: "You don't have access to this page" })).toBeVisible();
    });

    test("an API 403 is shown as a permission error, not a session expiry", async ({ page }) => {
        await signIn(page, fixtures().zawadi);
        await expect(page).toHaveURL(/\/patient$/);
        await page.route("**/api/patients/me", (route) =>
            route.fulfill({ status: 403, json: { success: false, message: "You do not have permission to access this resource" } }));
        await page.reload();
        await expect(page.getByText("Couldn't load this information")).toBeVisible();
        await expect(page.getByText("You do not have permission to access this resource")).toBeVisible();
        await expect(page).toHaveURL(/\/patient$/);
        expect(await page.evaluate(() => localStorage.getItem("token"))).toBeTruthy();
    });
});
