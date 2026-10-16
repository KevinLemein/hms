import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { expect } from "@playwright/test";
import { FIXTURES_FILE } from "./global-setup.js";

export const fixtures = () => JSON.parse(readFileSync(FIXTURES_FILE, "utf8"));

export async function signIn(page, { email, password }) {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
}

/** Run SQL against the throwaway e2e database (used only to set up edge cases). */
export function sql(statement) {
    const { pg } = fixtures();
    return execFileSync("docker", ["exec", pg.container, "psql", "-U", pg.user, "-d", pg.db, "-qtA", "-c", statement]).toString().trim();
}

/** "yyyy-MM-ddTHH:mm" for <input type="datetime-local">, days from today at the given hour. */
export function localDateTime(daysAhead, hour) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00`;
}

export async function expectToast(page, text) {
    await expect(page.getByRole("status").filter({ hasText: text }).or(page.getByRole("alert").filter({ hasText: text })).first()).toBeVisible();
}
