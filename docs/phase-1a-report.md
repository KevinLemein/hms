# Phase 1a — Critical Correctness & Security Fixes: Report

- **Date:** 2026-10-16 · **Branch:** `main` (uncommitted; nothing committed or pushed)
- **Scope (approved):** billing/payments, booking + consultation charge, double-booking,
  401/403, safe error handling, patient `/me`, doctor appointment authorization, status
  transitions, patient-dashboard integration, regression tests.
- **Not touched (per approval gates):** UI redesign, Flyway, .NET API, production systems,
  WebMD-style features.

## 1. Baseline vs. after

| Check | Baseline (before Phase 1a) | After |
|---|---|---|
| `./mvnw test` (no env, no profile) | **Fail** — `contextLoads` cannot configure a DataSource | **Pass — 54/54** (Testcontainers PostgreSQL 16, isolated, fictional data). Run twice; stable |
| `vite build` | Pass | Pass |
| `eslint .` | 9 errors, 11 warnings | 8 errors, 11 warnings — the PatientDashboard error is fixed; the remaining 8 are all pre-existing in files outside this phase (AdminDashboard ×3, AuthContext ×2, ToastContext, Login `roleLabels`, Register) |

Pre-existing failures are not counted as regressions. **No regressions found.**

### Each new test was first run against the unfixed code

| Test class | Before fix | After |
|---|---|---|
| `BillingIntegrationTest` | 8 / 9 failing | 9 / 9 |
| `AppointmentBookingIntegrationTest` | 4 / 9 failing (after the billing fix); every booking failed before it | 9 / 9 |
| `AuthenticationResponsesIntegrationTest` | 5 / 7 failing | 7 / 7 |
| `ErrorHandlingIntegrationTest` | 8 / 8 failing | 8 / 8 |
| `PatientSelfServiceIntegrationTest` | 5 / 8 failing | 8 / 8 |
| `AppointmentAuthorizationIntegrationTest` | 10 / 12 failing | 12 / 12 |
| `BackendApplicationTests` | failing (no datasource) | 1 / 1 |

Mutation check: with the bill row lock removed from `recordPayment`,
`concurrentPaymentsCannotExceedTheBalance` fails (more than one over-balance payment
succeeds). The test therefore detects the race it targets; the lock was restored.

## 2. What changed

### Billing
- **NPE fixed**: `BillLineItem.calculateTotal()` runs when an item is attached
  (`Bill.addLineItem`), not only at `@PrePersist`.
- **Transaction boundaries**: `addLineItem`, `recordPayment`, `cancelBill` each run in one
  transaction holding `SELECT … FOR UPDATE` on the bill row; `createBill` locks the
  appointment row.
- **Idempotent charges**: an existing `(source, sourceReferenceId)` returns the bill unchanged
  (replaces a catch-and-continue that could not work inside a transaction). Cross-bill races
  hit the existing unique constraint → **409**.
- **Payments**: a reference already recorded for the same method → **409**; `recordedByUserId`
  added to `PaymentResponse` (audit). Payments are never deleted; bills with payments still
  can't be cancelled.
- `createBill` rejects an appointment belonging to a different patient (400).

### Booking
- One transaction: validate → lock doctor `users` row → conflict check → save appointment →
  bill → consultation charge. Any failure rolls back everything.
- Double-booking: same doctor + same start time with an active appointment → **409**
  (CANCELLED/NO_SHOW slots can be rebooked).
- Disabled doctors rejected; unparseable date → 400 with a fixed message.
- Fee from `app.billing.consultation-fee` (default **500.00**, unchanged value).
- **Frontend duplicate charge removed** (`ensureConsultationCharge` and both call sites).

### Authentication / authorization responses
- `JsonSecurityErrorHandler`: **401** + `WWW-Authenticate: Bearer` + JSON for missing/invalid/
  expired tokens and disabled accounts; **403** + JSON for URL-rule denials.
  The web app's existing 401 handler now redirects expired sessions to sign-in as intended.

### Error handling
- Only our own messages reach clients. New mappings: unreadable body 400, type mismatch 400,
  missing param 400, unknown route **404**, wrong method 405, wrong content type 415,
  constraint violation 409, lock failure 409, invalid state transition 409.
- Unhandled `RuntimeException` → **500** with a generic message (was 400 + raw message).
- Validation errors add `errors: { field: message }` (additive; `message` unchanged).
- Date-of-birth parse and null role made safe.

### Patient `/me`
- `GET /api/patients/me`, `/me/appointments`, `/me/prescriptions` (with drug + doctor names),
  `/me/bills`. `ROLE_PATIENT` only; identity from the token.
- `AuthResponse` gains `firstName`, `lastName` (additive).

### Doctor & appointment authorization, transitions
- `GET /appointments/doctor/{id}` and `/doctor/{id}/today`: a doctor may only read their own.
- `GET /appointments/today` (all doctors): receptionist/admin only.
- `GET /appointments/{id}`: front desk, assigned doctor, or the appointment's patient.
- `PATCH /appointments/{id}/status`: typed body (same JSON shape); transition graph
  enforced (409); doctors only on their own appointments and only to
  `IN_CONSULTATION`/`COMPLETED` (403). Receptionist/admin keep every allowed transition, so the
  existing front-desk buttons still work.
- Prescriptions: only the assigned doctor can create; only the prescribing doctor can
  edit/delete (admin can delete).

### Patient dashboard
- Uses `/me` endpoints (fixes the always-failing prescriptions tab).
- Bills render `status`, `lineItems`, `payments[]`, `balance` (were wrong field names).
- Greeting uses the patient's name; the no-op "Emergency Contact" card is no longer clickable.

## 3. Behaviour changes existing clients will notice
| Change | Impact |
|---|---|
| 401 instead of 403 for auth failures | Intended; web redirects to sign-in on expiry |
| Unexpected errors 500 instead of 400 | Web shows the generic message either way |
| Invalid/backwards status changes → 409 | Front-desk UI only offers valid transitions |
| Doctors can no longer read other doctors' schedules or `/appointments/today` | Not used by the doctor UI |
| Same-slot double booking → 409 | Receptionist sees the error message |

No database schema changes were made. No new tables or columns, and no migration is needed. The
row locks use existing primary keys.

## 4. Remaining defects (known, not fixed in 1a)
1. ~~Drug-dispense charge is still created by the browser~~ — **resolved in Phase 1a-2**
   (`docs/phase-1a-2-report.md`).
2. ~~Drug stock decrement has no row lock~~ — **resolved in Phase 1a-2**.
3. Integrity rules are app-level only (bill-per-appointment, payment-reference uniqueness,
   double-booking). DB constraints need Flyway (D3). Whether `uq_line_item_source` exists in
   **production** is unverified.
4. Double-booking only detects identical start times; slot length is a product decision.
5. Doctors can still list **all** prescriptions (`GET /api/prescriptions`) and all patients.
6. Receptionist "register patient + book" is two requests: if booking fails the patient
   still exists and the form shows a generic error.
7. No login rate limiting; 6-character generated patient passwords; no password change;
   no refresh/revocation (Phase 2/3, D5).
8. Admin can demote/disable themselves; JWT filter logs token-parse messages at ERROR.
9. Timezone: "today" and "past" use server local time.
10. Frontend: pickers only search the first 20 patients; 8 pre-existing lint errors;
    sessions stored before this change lack `firstName` (dashboard falls back to profile).
11. **UI changes were verified by build/lint only — not exercised in a browser.**
12. `README.md` remains out of date (Phase 5).

## 5. Outstanding production security actions
See `docs/security-incident-checklist.md`. **None have been performed**; production is
not contained until the operator signs off C1–C3.
