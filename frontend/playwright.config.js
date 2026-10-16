import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against a LOCAL backend and a throwaway database with
// fictional data. See e2e/README.md for how to start them. Never point these
// at production: the setup creates accounts, bookings and payments.
const API = process.env.E2E_API_BASE_URL || "http://localhost:18080/api";

export default defineConfig({
    testDir: "./e2e",
    // Specs build on each other's data (01 -> 05), so run them in order.
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [["list"]],
    globalSetup: "./e2e/global-setup.js",
    use: {
        baseURL: "http://localhost:5173",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "npx vite --port 5173 --strictPort",
        url: "http://localhost:5173",
        reuseExistingServer: false,
        env: { VITE_API_BASE_URL: API },
        timeout: 60_000,
    },
});
