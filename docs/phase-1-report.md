# Phase 1 — UI Redesign and Usability: Report

- **Date:** 2026-10-16 · **Branch:** `main` · **Nothing committed, pushed or deployed.**
- **No production system was accessed.** All browser testing used a local backend and a
  throwaway PostgreSQL container with fictional data; both were stopped afterwards.
- **No backend files were changed in this phase** (the backend changes in the working tree are
  Phase 1a / 1a-2). No schema changes, no Flyway, .NET API untouched.
- Approval decisions applied: Playwright for browser tests (1); local `Icon` component, no icon
  dependency (2); the doctor-scoped prescriptions endpoint is **documented, not built** (3);
  `Register.jsx` left untouched (4).

## 1. Design decisions

| Decision | Rationale |
|---|---|
| Keep teal / slate / white, thin borders, cards | The existing identity was calm and appropriate; the problem was inconsistency, not direction. |
| Primary actions use `brand-700` (teal-700), not teal-600 | White on teal-600 is ~3.7:1, below WCAG AA 4.5:1 for normal text; teal-700 is ~5.5:1. |
| Hint/secondary text `slate-600`, not `slate-400` | slate-400 on white is ~2.6:1 (fails AA). |
| Tokens via Tailwind 4 `@theme` in `Styles.css` | Same styling tech, no new framework: `brand-*`, `rounded-control/card`, `shadow-card/overlay`. |
| One global `:focus-visible` outline | Consistent, visible keyboard focus everywhere; not shown for mouse clicks. |
| `prefers-reduced-motion` rule | Disables spinners'/skeletons' animation and transitions for users who ask. |
| Underline tabs, no "quick action" cards | The cards only duplicated the tabs; replaced by a short "Common tasks" row (reception) or removed. Removes visual noise and emoji. |
| Removed gradients, blur blobs, emoji | Per direction; emoji replaced by one SVG icon set. |
| Home and login copy describe only real features | The old copy promised "medical records" and "diagnoses", which the backend doesn't have. No sign-up / self-booking implied. |
| Statuses always icon + text | Never colour alone. One mapping (`lib/statuses.js`) for appointment, bill, role and account states; friendlier labels ("Booked", "Unpaid", "No-show"). |
| Tables become stacked cards below `md` | Clinical lists readable on a phone without sideways scrolling (verified at 375 px). |

## 2. Shared components (`src/components/ui/`)

| Component | Replaces / solves |
|---|---|
| `Button` (primary, secondary, danger, dangerOutline, ghost; `loading`) | ~40 ad-hoc button class strings; `loading` disables the button, which prevents duplicate submissions |
| `TextField`, `SelectField`, `TextAreaField`, `FieldGroup` | 5 copies of `inputClass` with 4 different focus colours; adds label↔control ids, `aria-invalid`, `aria-describedby` hint/error |
| `Card`, `CardHeader`, `PageHeader`, `DetailList` | Repeated containers; one `h1` per screen, `h2`/`h3` beneath |
| `StatusBadge` (+ `lib/statuses.js`) | 4 separate status-colour maps |
| `DataTable` | 6 hand-written tables; adds `scope="col"`, captions, mobile card layout |
| `Modal`, `ConfirmDialog` | 5 overlays with no dialog semantics; adds focus trap, Escape, focus return, scroll lock, `busy` guard |
| `Tabs`, `FilterGroup` | 4 tab bars; ARIA tablist with arrow/Home/End keys; filters exposed as `aria-pressed` toggles |
| `Spinner`, `PageSpinner`, `SkeletonRows` | 7 hand-written spinners; announced to screen readers |
| `EmptyState`, `Alert`, `LoadError` | Inconsistent empty/error text; errors `role="alert"`, others `role="status"`; retry action |
| `Pagination` | Patient, user and bill lists previously showed only page 1 of 20 |
| `StatCard`, `Icon` | Emoji stat icons; one icon set |
| `AppShell` | Skip link, header, single `<main>` landmark |

Helpers (`src/lib/`): `format.js` (dates, KES, names), `apiError.js` (safe messages; per-field
errors from `ApiResponse.errors`), `useLoader.js` (load/loading/error/retry, replacing the repeated
try/catch blocks), `statuses.js`.

## 3. Dashboard refactoring

| Page | Before | After |
|---|---|---|
| `ReceptionistDashboard.jsx` | 1,096 lines, 10 inline components | ~75 lines + `features/receptionist/` (overview, appointments, booking, patient picker, registration, patients, billing, add-charge, record-payment, credentials, `useDoctors`) |
| `DoctorDashboard.jsx` | 711 lines | ~90 lines + `features/doctor/` (queue, appointments, prescriptions, prescribe dialog) |
| `PatientDashboard.jsx` | 405 lines | ~60 lines + `features/patient/` (overview, appointments, prescriptions, bills) |
| `AdminDashboard.jsx` | 364 lines | ~185 lines + `features/admin/CreateUserDialog.jsx` |

Shared between roles: `features/billing/BillDetails.jsx` (receptionist + patient) and
`features/appointments/` (`useStatusChange`, `AppointmentActions`: confirmation, per-row pending
state and error toasts for status changes).

The API modules and auth flow were kept. Additive changes only:
- `getAllPatients` / `getAll` (bills) / `getAllUsers` accept optional `page, size` (defaults unchanged).
- `prescriptionService.create` also returns `created` (201 vs replayed 200).
- `axios.js` honours `VITE_API_BASE_URL` (the default is unchanged; used by the e2e tests).

## 4. Frontend defects found and fixed

| Defect (pre-existing) | Fix |
|---|---|
| **Receptionist billing never worked from the UI.** It read `paymentStatus`/`items`/`paymentMethod` (API returns `status`/`lineItems`/`payments[]`), so the Add-charge / Record-payment buttons never rendered; `PaymentModal` also sent `{paymentMethod, paymentReference}` instead of `{amount, method, reference}` | Rebuilt on the real `BillResponse`; payment dialog supports part payments and validates the reference (the backend requires one for M-Pesa **and** card; the old UI marked card as optional) |
| Billing "Pending" filter requested a non-existent status (always 400) | Filters use real statuses: Unpaid, Partially paid, Paid, Cancelled |
| **"Session expired" notice could never appear.** On a 401, the protected page's guard redirected again without state (React Router applies navigations as transitions), overwriting `{sessionExpired}` | `AuthContext` keeps a `sessionExpired` flag; `ProtectedRoute` carries it on its redirect. Proven by the e2e test, which failed before and passes after |
| Wrong password also fired the global "session expired" event | Interceptor ignores 401s from `/auth/login` |
| Patient pickers only searched the first 20 patients | Server-side search (`/patients/search`), WAI-ARIA combobox |
| Admin user list, stats and role filter saw only the first page | Server pagination; role filter uses `/admin/users/role/{role}` |
| Doctor could prescribe only one drug per appointment in the UI (backend allows several) | Per-appointment "Prescribe" stays available; shows the count |
| Doctor "Patient queue" reachable only via a card | It's now a tab (the default) |
| Register + book: if booking failed after registration, a generic "Failed to register" was shown although the patient existed | Credentials are shown with a warning that the appointment wasn't booked |
| "Consultation Fee" preset in Add charge invited double-charging (server adds it at booking) | Preset removed |
| Toasts all used `role="alert"`; toast container overflowed at phone width | Success toasts `role="status"`; full-width on small screens; above dialogs |
| Tab title "HOSI" | "MediCare" |

## 5. Accessibility
- **Keyboard:** skip link; ARIA tabs with arrow/Home/End keys; dialogs trap focus, close on Escape and return focus to the trigger; all actions are real buttons (no clickable `div`s); combobox keyboard support.
- **Focus:** one visible `:focus-visible` outline everywhere.
- **Forms:** every control has a `<label>`; required fields are marked (asterisk hidden from screen readers; `required` set); hints and errors are linked via `aria-describedby`; `aria-invalid` on errors; server field errors are mapped next to fields; `autocomplete` on sign-in.
- **Structure:** one `h1` per screen, sectioned headings, table captions and `scope="col"`, `<dl>` for details, `fieldset`/`legend` for groups and radio choices.
- **Status and errors:** icon plus text, never colour alone; `role="alert"` for errors and `role="status"` for confirmations and loading.
- **Icon-only controls:** labelled ("Close dialog", "Dismiss notification").
- **Row actions:** carry the patient's name ("Check in: Jabari Ochieng").
- **Contrast:** primary buttons and hint text fixed (see §1).
- **Reduced motion:** respected.
- **Not done:** no automated axe/contrast audit was run (no extra dependency was added for it).

## 6. Browser verification (Playwright, Chromium, actually exercised)

Setup: `frontend/e2e/README.md`. Local backend on :18080, throwaway Postgres container, fictional
data seeded by `e2e/global-setup.js` through the API (drugs via `psql` into the container).
**22 / 22 tests passed** on the final run (21.6 s).

| Area | Verified in the browser |
|---|---|
| Auth | Each role signs in to its own dashboard and signs out; wrong password shows "Incorrect email or password."; protected page without a session redirects to sign-in; invalid/expired token (API 401) ends the session **and shows the expiry notice**; a patient visiting `/receptionist` sees access denied; an API **403 is shown as a permission error, does not redirect, and the token is kept** |
| Receptionist | Register a patient and book the first visit; one-time password dialog; Escape closes it; client validation before submit; booking; **409 for a taken slot shown inline**; check-in; cancel asks for confirmation, Escape backs out and returns focus, confirm cancels; **M-Pesa payment recorded**; **reused M-Pesa code rejected (409) inline**; manual charge sent with `source: MANUAL` |
| Doctor | Sees own queue; start consultation; prescribe; **the request body carries no price fields** (`unitPrice`, `price`, `cost`, `totalPrice`, `chargeAmount`, `amount`) and **no request to `/api/bills` is made**; success shows the server-calculated charge (360.00 = 3 × 120.00); **identical re-submission does not dispense or charge again** (stock and charge count checked in the DB); insufficient stock blocked in the form and, when stock changed meanwhile, the **server 409 is shown and nothing is dispensed**; unpriced drug can't be chosen; complete visit; own prescription list |
| Patient | Name and allergies on overview; appointments; prescriptions with drug and doctor names; bill status "Partially paid", consultation + medication lines, M-Pesa payment reference, balance-due notice |
| Accessibility | Skip link moves focus to `<main>`; tab arrow-key behaviour and `aria-selected`; dialog focus trap + Escape + focus return; 375 px viewport has no horizontal page scroll |

Screens were also reviewed visually from screenshots (desktop and 375 px). Before the final run,
4 tests failed: 1 was the session-expiry app defect above (fixed); 3 were test-code
selector mistakes (fixed in the tests, no app change).

**Not exercised in a browser:** the admin role-change / enable-disable confirmation flows and
pagination with more than 20 records (built and type-checked through the build only); Firefox
and Safari; screen-reader output (structure verified, not a real screen reader).

## 7. Results vs. baseline

| Check | Baseline (before Phase 1) | After |
|---|---|---|
| Frontend build | Pass | **Pass** (363 kB JS / 35 kB CSS) |
| Frontend lint | 8 errors, 11 warnings | **4 errors, 0 warnings.** All 4 pre-existing, in `AuthContext.jsx` (2), `ToastContext.jsx` (1) and the unrouted `Register.jsx` (1). No rules were disabled; the e2e folder gets Node globals |
| Frontend unit tests | none exist | none (browser tests added instead) |
| Browser tests | none | **22 / 22 pass** |
| Backend suite | 72 pass | **72 / 72 pass** (no backend changes this phase) |

## 8. Remaining UI defects / limitations
1. The doctor's Prescriptions tab filters to their own appointments **in the browser**; the API still sends every doctor's prescriptions (backend, see §9).
2. Reception can "Check in" an appointment booked for a future day (unchanged existing behaviour; the backend allows it).
3. Small cosmetic issues: the long "Last visit" date wraps in its stat card on phones; the "All appointments" order is the backend's default order.
4. Register-and-book is still two requests (no combined endpoint).
5. The admin flows and >20-record pagination were not exercised in the browser.
6. Bundle size grew slightly in gzip (106 → 112 kB) due to the new components; no code splitting yet.
7. **Preservation note:** the two **commented-out** legacy `handleSubmit` blocks you had added (uncommitted) to `ReceptionistDashboard.jsx` were not carried into the split files. They were inactive code; their working replacement was the client-side consultation charge, which Phase 1a removed (D7). All other earlier uncommitted work is preserved: `Home.jsx` keeps your `onClick={handleLogout}` fix, and `Login.jsx` keeps your `Navigate` change.
8. `Register.jsx` (unrouted, calls a non-existent endpoint) left untouched, as decided.

## 9. Backend issues discovered (not changed; proposed separately)
1. `GET /api/prescriptions` returns every doctor's prescriptions to any doctor. Proposal: `GET /api/prescriptions/mine` (scoped by the token), plus a test.
2. `PATCH /api/admin/users/{id}/role` allows changing a staff account to Patient without creating a patient record; the UI now warns, but the backend should refuse or handle it.
3. The backend still allows an admin to demote or disable themselves. The UI now disables those controls on your own row, but only the backend can enforce it.

## 10. Files
- **New:**
  - `src/components/AppShell.jsx`, `src/components/ui/*` (13 files), `src/lib/*` (4);
  - `src/features/{admin,appointments,billing,doctor,patient,receptionist}/*` (23);
  - `playwright.config.js`, `e2e/*` (5 specs, setup, helpers, README).
- **Modified:**
  - `src/pages/*` (except `Register.jsx`, `Dashboard.jsx`), `Navbar`, `ProtectedRoute`;
  - `AuthContext`, `ToastContext`, `Styles.css`, `index.html`;
  - `api/{axios,adminService,billService,patientService,prescriptionService}.js`;
  - `package.json` / `package-lock.json` (only `@playwright/test` added), `eslint.config.js` (Node globals for e2e), `.gitignore` (Playwright output).
- Production security containment (`docs/security-incident-checklist.md`) remains open and is
  unaffected by this phase.
