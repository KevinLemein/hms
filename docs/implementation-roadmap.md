# MediCare — Implementation Roadmap

- **Date:** 2026-10-16 · **Based on:** `docs/implementation-audit.md`
- **Status:** Proposed — awaiting approval. Nothing below has been implemented.

---

## 1. Decisions needed before Phase 1

The brief assumes a WebMD-style public platform on Gradle + Flyway + OAuth2 across
several services. The repository is a single-service, clinic-internal HMS on Maven
with custom JWT and Hibernate-managed schema. These decisions change what each phase
contains:

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | **Product scope** | (a) Harden and polish the existing clinic HMS and expose its patient-facing slice to mobile; (b) also build the public marketplace (physician directory, specialties, patient self-registration, self-booking with availability) | **(a) first**, with the directory/self-booking as an explicit later phase. (b) is new product work — availability/slots, public profiles, self-registration, verification — not "improvement". |
| D2 | **Build tool** | Keep Maven (actual) | Keep Maven. The "do not migrate Gradle→Maven" rule doesn't apply; migrating to Gradle has no payoff. |
| D3 | **Schema management** | Introduce Flyway with a baseline taken from the real production schema | **Yes**, but it needs a schema-only dump of production (I have not accessed it). Until then, no schema changes. |
| D4 | **The .NET API** | Retire / lock down / keep | **Retire** from deployment (the web app no longer calls it) after confirming with its owner; remove the nginx routes; keep the folder or archive it. Needs the colleague who owns it to agree. |
| D5 | **Mobile authentication** | (a) Keep first-party JWT login, add short-lived access tokens + rotating refresh tokens + revocation; (b) adopt Spring Authorization Server with Authorization Code + PKCE | **(a)** for this scope (first-party clients only, one service). (b) is the right move only if third-party clients or SSO are in scope. Note: (a) is first-party credential login, not the OAuth ROPC grant — no OAuth grant is being introduced. |
| D6 | **Payments** | Manual staff-recorded payments (current) vs. M-Pesa STK Push / Daraja integration | Keep manual for now; mobile shows bill status read-only. A Daraja integration needs credentials, a callback URL and server-side verification — a separate phase. |
| D7 | **Uncommitted changes** | The backend auto-charge and the frontend `ensureConsultationCharge` duplicate each other and booking currently fails | Keep the **server-side** auto-charge (correct place for the rule), fix the billing NPE, drop the client-side duplicate. I will not touch these files until you approve. |

## 2. Urgent actions for you (outside code changes; I have not done these)

1. **Rotate the production PostgreSQL password** — it is in Git history
   (`dotnetapi/appsettings.json`, commit `bac30a3`). Removing the file from HEAD is not
   enough; treat the credential as compromised. Restrict DB network access to the
   application hosts.
2. **Take the deployed .NET API offline or put it behind authentication.** It exposes
   anonymous read/write to the production DB, including password hashes via `/api/Users`.
3. **Check whether the README's historical admin account exists in production** and
   rotate/disable it.
4. Decide whether history should be rewritten to purge the secret (requires a
   coordinated force-push — I will not do this without explicit instruction).

---

## 3. Phased plan (adapted to the real codebase)

Ordering principle: fix what is broken and insecure first, then polish UI on top of
correct data, then publish a stable contract. Phase 1 (web UX) depends on several
backend fixes, so a small **Phase 1a** of backend corrections precedes visual work.

### Phase 1a — Make existing workflows actually work (backend + minimal frontend)
Small, targeted fixes; each with a regression test.
1. Fix `BillLineItem.totalPrice` computation so `addLineItem` works (compute on
   build/set, not only `@PrePersist`). Restores booking with the uncommitted
   server-side consultation charge. Remove the client-side duplicate charge.
2. Add `AuthenticationEntryPoint` → **401** JSON for missing/invalid/expired tokens;
   keep 403 for insufficient permissions.
3. Error handling: stop echoing `RuntimeException.getMessage()`; map
   `HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`,
   `NoResourceFoundException` (→404), `DataIntegrityViolationException` (→409, generic
   text) explicitly; keep domain exceptions' messages.
4. Add `GET /api/patients/me`, `GET /api/patients/me/appointments`,
   `GET /api/patients/me/prescriptions` (with drug name), `GET /api/patients/me/bills`
   — server-derived identity, no IDs from the client. The `/api/patients/me/**` rule
   already exists in `SecurityConfig`.
5. Add `firstName`/`lastName` to `AuthResponse` (additive).
6. Frontend patient dashboard: use the `/me` endpoints and the real `BillResponse`
   field names.

### Phase 1 — Web experience (after 1a)
- Tailwind 4 `@theme` tokens (brand teal scale, slate neutrals, semantic
  success/warning/danger/info, radius, shadow, focus ring) in `Styles.css`.
- Shared primitives in `src/components/ui/`: Button, Field/Input/Select/Textarea,
  Card, Badge (status), Tabs (ARIA tablist), Modal (dialog, focus trap, Esc),
  DataTable with mobile card fallback, EmptyState, ErrorState with Retry, Spinner/Skeleton.
- Split dashboard monoliths into per-feature files using those primitives — behaviour
  preserved.
- Patient: profile, appointments (upcoming/past), prescriptions, bills with line items
  and payment history; honest empty states ("bookings are made at reception").
- Staff: server-side patient search in pickers (replace page-0 client filtering),
  paging, confirmations for cancel/no-show.
- Home/Login: unify brand ("MediCare"), fix `<title>`, align copy with real features,
  remove emoji icons. No invented doctors, ratings or availability.
- Add Vitest + React Testing Library for the auth flow and patient dashboard; fix the
  9 lint errors.

### Phase 2 — Backend correctness and integrity
- **Flyway** (D3): add dependency; `V1__baseline.sql` generated from the prod
  schema-only dump; `baseline-on-migrate`; switch `ddl-auto` to `validate`.
  No destructive changes.
- Appointment rules: explicit state machine (PENDING→WAITING/CANCELLED/NO_SHOW;
  WAITING→IN_CONSULTATION/NO_SHOW; IN_CONSULTATION→COMPLETED), role per transition,
  doctor may only act on own appointments; typed request DTO.
- Double-booking: partial unique index on `(doctor_id, appointment_date_time)` where
  status not in (CANCELLED, NO_SHOW) + service pre-check; map the violation to 409.
  (Slot length/working hours only if D1 includes availability.)
- Concurrency: pessimistic lock (`SELECT … FOR UPDATE`) on drug row for prescriptions
  and on bill row for payments; `@Version` on `bills`/`drugs`; unique
  `bills(appointment_id)`; unique `payments(method, reference)` where reference not null.
- Prices from the server: drug charge uses `drugs.cost`; consultation fee from config;
  drug-dispense billing moves into `PrescriptionService` (same transaction). Manual
  charges remain staff-entered.
- Doctor authorization on prescriptions (own appointment only); no hard delete of
  prescriptions (void/cancel status instead).
- Admin: forbid self-demotion/disable of the last admin.
- Patient passwords: longer generated passwords, `mustChangePassword` flag,
  `POST /api/auth/change-password`.
- Timezone: configure `Africa/Nairobi` explicitly; store `timestamptz` going forward
  (additive migration).
- Observability: request-ID filter (`X-Request-Id`, MDC), structured logs,
  `show-sql=false`, Spring Boot Actuator `health` only; never log tokens/PHI.

### Phase 3 — Client-facing API for web + Flutter
- **Versioning:** expose client-facing endpoints under `/api/v1/**`; keep current
  `/api/**` paths working for the web app until it migrates, then deprecate.
  Additive-only changes within v1.
- **Error contract:** keep the `ApiResponse` envelope (existing clients depend on it)
  and add `error: { code, fieldErrors: {field: msg}, requestId }` on failures.
- **Pagination:** every list returns `PagedResponse`; consistent `page`, `size`
  (max 100), `sort`.
- **Typed DTOs** everywhere (no `Map` bodies); ISO-8601 date-times with offset.
- **Auth for mobile (D5):** access token 15 min; refresh token (opaque, hashed in DB,
  rotation + reuse detection) via `POST /api/v1/auth/refresh`; `POST /api/v1/auth/logout`
  revokes; login rate limiting (bucket per IP + account); flutter stores refresh token
  in secure storage. Web keeps working unchanged.
- **CORS:** origins from configuration (`APP_CORS_ALLOWED_ORIGINS`), no wildcards,
  `allowCredentials=false` (bearer tokens). Document that native Flutter is unaffected.
- **OpenAPI:** `springdoc-openapi` generated from controllers/DTOs; Swagger UI enabled
  in dev profile only; only `/api/v1/**` in the published spec; bearer security scheme;
  examples with fictional data.
- **Docs:** `api-reference.md`, `api-integration.md`, `authentication-guide.md` with a
  feature→endpoint map for the patient app.

Patient-app scope available under D1(a): sign in, change password, profile,
appointments (list/detail), prescriptions, bills & payment history. Not available
until D1(b)/D6: physician directory, self-booking, cancellation by patient,
messaging/consultations, notifications, online payment.

### Phase 4 — Security & QA
Integration tests (Testcontainers Postgres) for: 401 vs 403; cross-patient access
on every patient-scoped route; doctor-to-doctor access; invalid transitions;
concurrent booking of one slot; concurrent prescriptions draining stock;
concurrent payments; duplicate charge submissions; error bodies contain no internals.
Plus nginx security headers and a dependency check.

### Phase 5 — Documentation & handover
Update `README.md` to reality; add `architecture-overview.md`,
`database-guide.md`, `testing-guide.md`, `development-setup.md`; Postman/Bruno
collection generated from the OpenAPI spec; explicit "verified against running
service" column for every endpoint.

---

## 4. What the Flutter developer needs that does not exist today
1. A way to get *their own* data without knowing internal IDs (`/me` endpoints).
2. 401 vs 403 semantics and a refresh/logout flow suitable for long-lived mobile sessions.
3. A stable, versioned, documented contract (OpenAPI) with typed DTOs and consistent
   pagination/errors.
4. A single base URL (today: nginx `/api` → Spring; the .NET routes must go).
5. Clarity on which product features exist — the brief's directory/self-booking do not.

## 5. Risks
- Production schema is unknown; Flyway baselining depends on a real dump.
- Two teams' code share one DB; retiring the .NET API needs its owner's agreement.
- Changing auth semantics (401) changes web behaviour — intended, but test the
  session-expired redirect after the change.
