// Seeds a fresh local database with fictional data for the browser tests.
// Expects: backend running at E2E_API_BASE_URL against an EMPTY throwaway
// database in the docker container E2E_PG_CONTAINER (see e2e/README.md).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.E2E_API_BASE_URL || "http://localhost:18080/api";
const PG_CONTAINER = process.env.E2E_PG_CONTAINER || "hms-e2e-pg";
const PG_USER = process.env.E2E_PG_USER || "e2e";
const PG_DB = process.env.E2E_PG_DB || "hms_e2e";
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL || "admin@example.test", password: process.env.E2E_ADMIN_PASSWORD || "E2E-Admin#2026" };
const STAFF_PASSWORD = "E2E-Staff#2026";

export const FIXTURES_FILE = join(dirname(fileURLToPath(import.meta.url)), ".state", "fixtures.json");

async function call(method, path, token, body) {
    const res = await fetch(API + path, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${json.message}`);
    return json.data;
}

const login = async (email, password) => (await call("POST", "/auth/login", null, { email, password })).token;

function sql(statement) {
    return execFileSync("docker", ["exec", PG_CONTAINER, "psql", "-U", PG_USER, "-d", PG_DB, "-qtA", "-c", statement]).toString().trim();
}

/** "yyyy-MM-ddTHH:mm:ss" in local time, minutes from now. */
function inMinutes(m) {
    const d = new Date(Date.now() + m * 60_000);
    d.setSeconds(0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export default async function globalSetup() {
    if (Number(sql("SELECT COUNT(*) FROM appointments"))) {
        throw new Error("E2E database is not empty. Recreate the throwaway database before running (see e2e/README.md).");
    }

    const admin = await login(ADMIN.email, ADMIN.password);
    const staff = (username, first, last, role) =>
        call("POST", "/admin/users", admin, { username, email: `${username}@example.test`, password: STAFF_PASSWORD, firstName: first, lastName: last, role });

    const recepUser = await staff("e2erecep", "Wanjiru", "Mwangi", "ROLE_RECEPTIONIST");
    const doctor = await staff("e2edoc", "Amani", "Kamau", "ROLE_DOCTOR");
    await staff("e2edoc2", "Baraka", "Otieno", "ROLE_DOCTOR");
    const recep = await login(recepUser.email, STAFF_PASSWORD);

    const register = (first, last, email, phone) => call("POST", "/patients/register", recep, {
        firstName: first, lastName: last, email, phoneNumber: phone, dateOfBirth: "1990-04-12",
        gender: "FEMALE", address: "Nairobi", allergies: first === "Zawadi" ? "Penicillin" : "",
    });
    const zawadi = await register("Zawadi", "Njeri", "zawadi.e2e@example.test", "0700100200");
    const jabari = await register("Jabari", "Ochieng", "jabari.e2e@example.test", "0700300400");

    // Today, a little later than now, so they are both "today" and "in the future".
    const a1 = await call("POST", "/appointments", recep, { patientId: zawadi.id, doctorId: doctor.id, appointmentDateTime: inMinutes(30), reason: "Persistent cough" });
    const a2 = await call("POST", "/appointments", recep, { patientId: jabari.id, doctorId: doctor.id, appointmentDateTime: inMinutes(45), reason: "Follow-up" });
    await call("PATCH", `/appointments/${a1.id}/status`, recep, { status: "WAITING" }); // Zawadi is checked in for the doctor

    sql(`INSERT INTO drugs (name, milligrams, category, cost, quantity) VALUES
         ('Amoxicillin', 500, 'Antibiotic', 120.00, 50),
         ('Paracetamol', 500, 'Analgesic', 20.00, 2),
         ('Unpriced Syrup', 100, 'Test', NULL, 10)`);

    mkdirSync(dirname(FIXTURES_FILE), { recursive: true });
    writeFileSync(FIXTURES_FILE, JSON.stringify({
        admin: ADMIN,
        receptionist: { email: recepUser.email, password: STAFF_PASSWORD },
        doctor: { email: doctor.email, password: STAFF_PASSWORD, id: doctor.id },
        zawadi: { email: zawadi.email, password: zawadi.generatedPassword, id: zawadi.id },
        jabari: { email: jabari.email, password: jabari.generatedPassword, id: jabari.id },
        appointments: { zawadiToday: a1.id, jabariToday: a2.id },
        pg: { container: PG_CONTAINER, user: PG_USER, db: PG_DB },
    }, null, 2));
}
