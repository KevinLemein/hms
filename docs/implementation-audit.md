# MediCare — Implementation Audit (Phase 0)

- **Date:** 2026-10-16
- **Branch:** `main` (up to date with `origin/main`, HEAD `a6fb32f "login system"`)
- **Scope:** Read-only audit. No application code was modified.
- **Uncommitted work present (preserved, not touched):**
  `backend/.../service/AppointmentService.java`, `frontend/src/api/billService.js`,
  `frontend/src/pages/Home.jsx`, `frontend/src/pages/Login.jsx`,
  `frontend/src/pages/ReceptionistDashboard.jsx`

Status labels used throughout:

| Label | Meaning |
|---|---|
| **Verified** | Exercised against a running instance (local throwaway Postgres, fictional data) |
| **Code-read** | Determined by reading source; not exercised at runtime |
| **Unverified** | Could not be checked (e.g. production DB, deployed .NET API) |

---

## 0. Headline findings

1. **The repository is not the system the brief describes.** It is a *clinic-internal
   Hospital Management System* (receptionist registers patients and books appointments;
   doctors consult and prescribe; patients get a read-only view). There is **no public
   physician directory, no specialty search, no patient self-registration, no patient
   self-booking, no consultation/messaging, no notifications, and no online payments**.
   The brief's stack assumptions are also wrong: the build is **Maven** (not Gradle),
   there is **no Flyway** (schema is managed by Hibernate `ddl-auto=update`), there is
   **no OAuth2 Authorization Server** (custom HS256 JWT login), and there is **one Spring
   Boot service**, not several. Phases 1–3 need re-scoping before work starts — see
   `implementation-roadmap.md` §1.
2. **Critical — production database credentials are committed to Git.**
   `dotnetapi/appsettings.json` (tracked since commit `bac30a3`) contains the host,
   username and password of the shared production PostgreSQL server.
3. **Critical — the .NET API is fully anonymous.** Every controller is
   `[AllowAnonymous]`, CORS is `AllowAnyOrigin`, and Swagger UI is enabled
   unconditionally. `GET /api/Users` returns the `users` entity including the `password`
   (BCrypt hash) column; full CRUD exists on patients, appointments, payments,
   prescriptions, etc. nginx documents it as deployed at an external HTTPS host and it
   shares the production database. (Code-read; the live deployment was **not** probed.)
4. **High — billing is broken end to end (Verified).** `POST /api/bills/{id}/items`
   always fails with a `NullPointerException` (`BillLineItem.totalPrice` is only set in
   `@PrePersist`, but `Bill.recalculateStatus()` sums it before persist). No charge can
   ever be added, so no payment can ever be recorded.
5. **High — the uncommitted change makes every appointment booking fail (Verified).**
   The new in-transaction consultation charge in `AppointmentService.bookAppointment`
   hits finding 4 and rolls back the whole booking. The raw NPE message is returned to
   the client.
6. **High — broken function/object-level authorization on appointments (Verified).**
   Any doctor can change the status of *any* appointment, to *any* status
   (e.g. `COMPLETED → PENDING`), and read any other doctor's schedule.
7. **High — authentication failures return 403, not 401 (Verified).** Missing or
   invalid tokens get `403` with an empty body. The web client only treats `401` as
   "session expired", so expired sessions surface as permission errors instead of
   redirecting to sign-in. A mobile client cannot distinguish "re-authenticate" from
   "forbidden".

---

## 1. Current architecture

```
Browser (React SPA, built by Vite, served by nginx :3000)
   │
   ├─ /api/Prescriptions*, /api/Drugs*  ──► .NET API (external HTTPS host) ─┐
   ├─ /api/**                           ──► Spring Boot (container :8080)  ─┤
   └─ /*                                ──► static SPA                     │
                                                                           ▼
                                           Shared remote PostgreSQL ("medicare")
```

| Component | Location | Tech (verified from files) | Notes |
|---|---|---|---|
| Spring Boot API | `backend/` | Spring Boot **4.0.5**, Java 21 target (Docker builds with JDK 25), **Maven** wrapper, Spring Security, JPA/Hibernate, jjwt 0.12.6, Lombok | Single deployable. The only backend the web app actually calls today. |
| .NET API | `dotnetapi/` | .NET **10** (csproj `net10.0`), EF Core + Npgsql, ASP.NET Identity Core, Swashbuckle | README says ".NET 8". Not in `docker-compose.yml`. nginx routes `/api/Prescriptions` and `/api/Drugs` (capitalised) to it, but the frontend now calls lower-case `/api/prescriptions` and `/api/drugs`, which nginx routes to Spring. **The web app no longer uses it**, but it is still deployed and points at the shared DB. |
| Web frontend | `frontend/` | React 19, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), React Router 7, Axios | README says "Vite 6". |
| Reverse proxy | `frontend/nginx.conf` | nginx (alpine) | Not an API gateway — plain path routing; no auth, rate limiting or header hardening. |
| Database | Remote PostgreSQL (prod); local `docker-compose` does **not** start a DB | — | Schema co-owned by Hibernate `ddl-auto=update` and EF Core migrations. |
| Infra | `docker-compose.yml` | backend + frontend only | Backend published on host port 8081. |

**Service communication:** none. The two backends never call each other; they
"integrate" by writing to the same tables.

**API gateway:** none. nginx is a path router; both backends are directly reachable.

**Configuration:** `application.properties` contains only `spring.application.name`.
All real config is in `application-docker.properties` (env-var driven:
`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`). An untracked `application-local.properties` exists
with local dev credentials. Root `.env` is git-ignored and not in history.

**Logging/monitoring:** default Spring Boot console logging; `spring.jpa.show-sql=true`
in all profiles; no correlation IDs, no metrics, no Actuator, no health endpoint.

**Tests:** one `@SpringBootTest contextLoads()` test. No frontend tests.

---

## 2. Backend audit (Spring Boot)

### 2.1 Package layout (`com.kevinlemein.backend`)
`config` (SecurityConfig, DataSeeder) · `controller` (8) · `dto` (24) · `exception`
(GlobalExceptionHandler + 3 domain exceptions) · `model` (15 entities/enums) ·
`repository` (7) · `security` (JwtService, JwtAuthenticationFilter,
CustomUserDetailsService, CurrentUserProvider, PatientSecurity) · `service` (7).

Layering is clean and conventional (controller → service → repository; DTOs at the
boundary; a consistent `ApiResponse<T>` envelope; a `PagedResponse<T>` wrapper).
This is a good foundation worth preserving.

### 2.2 Authentication (Code-read + Verified)

- `POST /api/auth/login` (email + password) → HS256 JWT, `sub` = email, claims
  `role`, `userId`; lifetime from `JWT_EXPIRATION` (README example 24 h).
- `JwtAuthenticationFilter` reloads the user from the DB on every request, so role
  changes and disabling an account take effect immediately. **Good.**
- No refresh tokens, no logout/revocation, no password change, no password reset,
  no self-registration (`RegisterRequest` DTO exists but is unused; the frontend
  `Register.jsx` calls a non-existent `/api/auth/register` and is not routed).
- No `AuthenticationEntryPoint` → unauthenticated requests get **403 with empty body**
  (Verified).
- No brute-force protection: 15 consecutive bad logins all return 401 (Verified).
- Patient passwords are auto-generated, **6 letters**, returned once in the
  registration response, and there is no way for the patient to change them.
- Filter logs every invalid token at ERROR including parser messages that echo
  token fragments.

### 2.3 Authorization (Code-read + Verified)

URL rules in `SecurityConfig` plus `@PreAuthorize` on every controller method.
`PatientSecurity` provides ownership checks for the patient role.

| Check | Result |
|---|---|
| Patient reads another patient's appointments / bills | **403 — correct** (Verified) |
| Patient reads own appointments | 200 (Verified) |
| Doctor B reads Doctor A's schedule (`/appointments/doctor/{id}`) | **200 — any doctor can read any schedule** (Verified) |
| Doctor B changes Doctor A's appointment status | **200 — no assignment check** (Verified) |
| Arbitrary status transitions (`COMPLETED → PENDING`) | **Allowed** (Verified) |
| Admin demotes own account | **Allowed**; next request is 403 (Verified) |
| Doctor edits/deletes another doctor's prescription | Allowed (Code-read) |
| Doctor/receptionist add any charge at any client-chosen price | Allowed by design (Code-read) |
| `GET /api/appointments/{id}` for patient | Not allowed even for own appointment (Code-read) |
| Patient access to own prescriptions | **No endpoint exists**; `/prescriptions` and `/drugs` → 403 (Verified) |
| `BillController` references `ROLE_PHARMACIST` | Role does not exist in `Role` enum (dead config) |

### 2.4 Validation & error handling (Verified)

`ApiResponse` envelope is consistent (`success`, `message`, `data`, `timestamp`).
Problems:

- The `RuntimeException` handler returns `ex.getMessage()` with **400** for *any*
  runtime exception. Verified leaks: `Cannot read field "intCompact" because "augend"
  is null` (NPE), `Cannot invoke "String.toUpperCase()" because "newStatus" is null`,
  `JSON parse error: Unexpected character ...`, `Text 'not-a-date' could not be parsed`.
  `DataIntegrityViolationException` is also a `RuntimeException` and would leak SQL
  constraint text (Code-read).
- Unknown routes return **500** (`NoResourceFoundException` falls to the generic handler) (Verified).
- Validation errors are flattened into one comma-joined string — no field map,
  no stable error code, no request/correlation ID.
- Several request bodies are untyped `Map<String,String>` (`PATCH /appointments/{id}/status`,
  `PATCH /admin/users/{id}/role`) — no validation, null → NPE.
- Dates are accepted as free-form strings and parsed manually.

### 2.5 Business-rule gaps

| Rule | State |
|---|---|
| Booking in the past rejected | Implemented (server clock, `LocalDateTime`, no zone) |
| Doctor double-booking | **Not enforced.** `countActiveDoctorAppointments` exists but is never called; no DB constraint. |
| Doctor availability / working hours / slots | Not implemented (`doctors.is_available` is never read) |
| Status state machine | Not enforced (any → any) |
| Who may set which status | Not enforced beyond role |
| Patient cancellation | Not possible (patients cannot write anything) |
| Prescription stock decrement | Implemented in one transaction, but **no locking** → concurrent prescriptions can oversell (Code-read) |
| Payment over-collection | Checked in service, but **no locking** → two concurrent payments can each pass the balance check (Code-read) |
| Payment reference uniqueness (M-Pesa code) | Not enforced |
| M-Pesa / card verification | None — payments are manually recorded by staff; no gateway integration |
| One bill per appointment | App-level check only; no unique constraint; race-prone |
| Line-item idempotency | DB unique `(source, source_reference_id)` — good idea, but the catch-and-continue inside a `@Transactional` method will likely mark the transaction rollback-only (Code-read, not reachable today because of the NPE) |
| Timezone | Server `LocalDate.now()` decides "today"; containers default to UTC while users are in EAT (UTC+3) |

### 2.6 ID model inconsistency

`appointments.doctor_id` → **`users.id`**, while `prescriptions.doctor_id` →
**`doctors.id`**. The frontend passes `user.id` as `doctorId` for appointment queries.
A client must know which "doctor id" each endpoint wants. Doctor profiles get
`speciality_id = 1` hard-coded; there is no specialities entity in the Java service.

---

## 3. Database audit

- **No migration tool in the Java service.** `spring.jpa.hibernate.ddl-auto=update`
  in every profile, against the shared production DB. Hibernate `update` never drops
  or tightens, silently diverges between environments, and cannot be reviewed.
- **Two schema owners for the same tables.** EF Core migrations in `dotnetapi/Migrations`
  (plus a hand-written `MigrationScript.sql`) create/alter `appointments`, `doctors`,
  `drugs`, `prescriptions`, `payments`, `users`, `patient`, `medical_records`,
  `specialities`, `gender`, `appointment_status`, Identity tables. The Java entities
  define different shapes for some of the same names — notably **`payments`** (EF:
  `appointment_id`, `total_amount`, `transaction_code`, `date_paid`; Java: `bill_id`,
  `amount`, `method`, `reference`, `recorded_by_user_id`, `paid_at`).
  `MigrationScript.sql` contains destructive statements (`DROP COLUMN`, `ALTER ... TYPE
  ... USING created_by_id::bigint`). **The actual production schema is Unverified** —
  it must be dumped (schema only) before any migration work.
- `database/init.sql` is a commented-out reference only.

Schema as produced by Hibernate from the Java entities (Verified on throwaway DB):
`users`, `patients`, `doctors`, `appointments`, `bills`, `bill_line_items`,
`payments`, `prescriptions`, `drugs`.

Missing constraints / indexes (Code-read):

| Table | Gap |
|---|---|
| `appointments` | No index on `(doctor_id, appointment_date_time)` or `patient_id`; no uniqueness for active slot; status not constrained |
| `bills` | No unique on `appointment_id`; no index on `patient_id`, `status` |
| `payments` | No unique on `(method, reference)` |
| `prescriptions` | `appointment_id`, `doctor_id`, `drug_id` are plain longs with no JPA FK (FKs may exist from EF — Unverified) |
| `doctors` | `user_id` not unique in Java mapping; `speciality_id` dangling |
| `drugs` | No `CHECK (quantity >= 0)`; no optimistic-lock version |
| all | No `@Version` columns anywhere |

Sensitive data: patient DOB, address, phone, allergies, emergency contacts,
appointment reasons/notes, prescriptions. `show-sql=true` logs statements (not bound
values by default).

---

## 4. Existing API inventory (Spring Boot — the only API in use)

Envelope for all responses: `{ success, message, data?, timestamp }`.
"Status" column: **V** = exercised at runtime in this audit, **C** = code-read only.

| Method | Path | Roles (as enforced) | Purpose | Request | Response `data` | Notes / defects | Status |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/login` | public | Login | `LoginRequest {email,password}` | `AuthResponse {token,type,id,username,email,role}` | Catches all exceptions → 401 | V |
| POST | `/api/admin/users` | ADMIN | Create staff user | `CreateUserRequest` | `UserResponse` (has always-null `password` field) | Creates `doctors` row for doctors | V |
| GET | `/api/admin/users` | ADMIN | List users (paged) | `page,size,sort` | `PagedResponse<UserResponse>` | | V |
| GET | `/api/admin/users/role/{role}` | ADMIN | Users by role | — | `UserResponse[]` | Unpaged | C |
| PATCH | `/api/admin/users/{id}/role` | ADMIN | Change role | `{role}` (Map) | `UserResponse` | Self-demotion allowed; no doctor row on promote | V |
| PATCH | `/api/admin/users/{id}/toggle-status` | ADMIN | Enable/disable | — | `UserResponse` | Can disable self | C |
| POST | `/api/receptionist/users` | RECEPTIONIST | Create user | `CreateUserRequest` | `UserResponse` | Receptionist can create DOCTOR/RECEPTIONIST/PATIENT (patient without `patients` row) | C |
| GET | `/api/receptionist/doctors` | RECEPTIONIST | List doctors | — | `UserResponse[]` | README wrongly says `/api/admin/doctors`; admin cannot call it | V |
| POST | `/api/patients/register` | RECEPTIONIST, ADMIN | Register patient + login | `RegisterPatientRequest` | `PatientResponse` incl. `generatedPassword` | 6-char password | V |
| GET | `/api/patients` | RECEPTIONIST, ADMIN, DOCTOR | List patients (paged) | `page,size` | `PagedResponse<PatientResponse>` | Web UI only reads page 0 (20 rows) and filters client-side | V |
| GET | `/api/patients/{id}` | RECEPTIONIST, ADMIN, DOCTOR | Patient by id | — | `PatientResponse` | | C |
| GET | `/api/patients/by-user/{userId}` | staff, or own user | Patient by user id | — | `PatientResponse` | Ownership enforced | C |
| GET | `/api/patients/search?query=` | RECEPTIONIST, ADMIN, DOCTOR | Search | — | `PatientResponse[]` | Unpaged, `%LIKE%` | C |
| POST | `/api/appointments` | RECEPTIONIST | Book | `BookAppointmentRequest` (date as string) | `AppointmentResponse` | **Fails 100% with uncommitted change**; no double-booking check | V |
| PATCH | `/api/appointments/{id}/status` | DOCTOR, RECEPTIONIST, ADMIN | Change status | `{status, notes}` (Map) | `AppointmentResponse` | No transitions, no assignment check, null → NPE leak | V |
| GET | `/api/appointments` | RECEPTIONIST, ADMIN | All appointments | — | `AppointmentResponse[]` | Unpaged, loads entire table | C |
| GET | `/api/appointments/today` | DOCTOR, RECEPTIONIST, ADMIN | Today (all doctors) | — | `AppointmentResponse[]` | Server-timezone "today" | C |
| GET | `/api/appointments/doctor/{doctorId}` | DOCTOR, RECEPTIONIST, ADMIN | By doctor (`users.id`) | — | `AppointmentResponse[]` | Any doctor can read any doctor | V |
| GET | `/api/appointments/doctor/{doctorId}/today` | same | Today by doctor | — | `AppointmentResponse[]` | same | C |
| GET | `/api/appointments/patient/{patientId}` | staff, or own patient | By patient | — | `AppointmentResponse[]` | Ownership enforced | V |
| GET | `/api/appointments/{id}` | DOCTOR, RECEPTIONIST, ADMIN | One appointment | — | `AppointmentResponse` | | C |
| GET | `/api/drugs` · `/api/drugs/{id}` | DOCTOR, RECEPTIONIST, ADMIN | Drug catalogue | — | `DrugResponse[]` / `DrugResponse` | No write endpoints; catalogue only editable via .NET API or SQL | V(403 for patient) |
| POST | `/api/prescriptions` | DOCTOR | Create + decrement stock | `CreatePrescriptionRequest` | `PrescriptionResponse` | Doctor id from token (good); no check doctor owns the appointment; no stock locking | C |
| GET | `/api/prescriptions` | DOCTOR, RECEPTIONIST, ADMIN | **All** prescriptions | — | `PrescriptionResponse[]` | Unpaged; web filters client-side | V(403 for patient) |
| GET | `/api/prescriptions/{id}`, `/doctor/{doctorId}`, `/appointment/{appointmentId}` | same | Lookups | — | | `doctorId` here is `doctors.id` | C |
| PUT | `/api/prescriptions/{id}` | DOCTOR | Edit dosage/duration/notes | `UpdatePrescriptionRequest` | | Any doctor, any prescription | C |
| DELETE | `/api/prescriptions/{id}` | DOCTOR, ADMIN | Delete + restock | — | — | Hard delete of clinical record | C |
| POST | `/api/bills` | DOCTOR, RECEPTIONIST, ADMIN | Create bill | `CreateBillRequest` | `BillResponse` | | V |
| POST | `/api/bills/{billId}/items` | DOCTOR, RECEPTIONIST, ADMIN | Add charge | `AddLineItemRequest` | `BillResponse` | **Always NPE → 400** | V |
| POST | `/api/bills/{billId}/payments` | RECEPTIONIST, ADMIN | Record payment | `RecordPaymentRequest` | `BillResponse` | Unreachable in practice (balance always 0); no locking | C |
| PATCH | `/api/bills/{billId}/cancel` | ADMIN | Cancel | raw string body | `BillResponse` | Body is raw text, not JSON | C |
| GET | `/api/bills` | RECEPTIONIST, ADMIN | Bills (paged) | | `PagedResponse<BillResponse>` | | C |
| GET | `/api/bills/status/{status}` | RECEPTIONIST, ADMIN | By status | | `BillResponse[]` | | C |
| GET | `/api/bills/appointment/{id}` | DOCTOR, RECEPTIONIST, ADMIN | Bill for appointment | | `BillResponse` | | C |
| GET | `/api/bills/patient/{patientId}` | staff, or own patient | Bills by patient | | `BillResponse[]` | Ownership enforced | V |
| GET | `/api/bills/{id}` | RECEPTIONIST, ADMIN | One bill | | `BillResponse` | | C |

Inconsistencies: mixed paged/unpaged lists; two meanings of "doctorId"; untyped Map
bodies; raw-string body on cancel; field typo `dossage` baked into the contract;
README endpoint table out of date (`/api/admin/doctors`, `/api/bills/{id}/pay`,
`/api/bills/from-prescription` don't exist). No OpenAPI/Swagger in the Spring service.
No API versioning.

### .NET API (deployed, unauthenticated) — Code-read only
`/api/Appointments`, `/api/AppointmentStatus`, `/api/Doctors`, `/api/Drugs`,
`/api/Gender`, `/api/MedicalRecords`, `/api/Patients`, `/api/Payments`,
`/api/Prescriptions`, `/api/Users` — each with GET list, GET by id, PUT, POST, DELETE,
all `[AllowAnonymous]`. Returns EF entities directly. Its JWT config uses a hard-coded
signing key that is unrelated to the Spring `JWT_SECRET`, but no endpoint requires it
anyway.

---

## 5. Frontend audit

**Stack:** React 19 SPA, React Router 7, Axios, Tailwind 4 utilities inline (no
component library, no design tokens — `tailwind.config.js` `extend` is empty and is
not used by Tailwind 4's Vite plugin). Teal/emerald brand, slate neutrals, rounded
cards, inline SVG heroicons, emoji accents. `index.html` title is **"HOSI"**; UI brand
is **"MediCare HMS"**.

**Structure:** 9 pages, 2 shared components (Navbar, ProtectedRoute), 2 contexts
(Auth, Toast), 8 API modules. Dashboards are monoliths (`ReceptionistDashboard.jsx`
1,105 lines; `DoctorDashboard.jsx` 759) containing many inline sub-components and
duplicated input/button/table/modal styling.

**Routing:** `/`, `/login`, `/unauthorized`, `/dashboard` (role redirect), `/admin`,
`/doctor`, `/receptionist`, `/patient`. `Register.jsx` exists but is unrouted and
calls a missing endpoint.

**Auth state:** JWT + user object in `localStorage`; Axios interceptor attaches the
token; 401 → custom event → redirect. Because the backend returns 403 (§2.2), the
redirect never fires on expiry.

**Verified/code-read defects in the patient experience:**

| Defect | Evidence |
|---|---|
| Prescriptions tab always errors for patients | Calls `/prescriptions` and `/drugs`, both 403 for `ROLE_PATIENT` (Verified) |
| Prescriptions tab design fetches *all* prescriptions and filters client-side | `PatientDashboard.jsx` `fetchPrescriptions` |
| Bills tab renders wrong/empty fields | Uses `bill.paymentStatus`, `bill.items`, `bill.paymentMethod`; API returns `status`, `lineItems`, `payments[]` |
| "Welcome, undefined undefined" | `user.firstName/lastName` are not in `AuthResponse` |
| "Emergency Contact" card is clickable with a no-op handler | `onClick: () => {}` |
| Patient/doctor pickers only see the first 20 patients | Paged list, page 0 only, filtered client-side |

**Staff flows:** drug-dispense charge is computed and posted **from the browser**
(`DoctorDashboard.jsx` PrescriptionModal) with a client-supplied `unitPrice`; the
uncommitted change adds a second, client-side consultation charge
(`billService.ensureConsultationCharge`) *in addition to* the new server-side one.

**Accessibility:** form labels present on most inputs (good). Gaps: tab bars are
plain buttons without `role="tablist"`/`aria-selected`; clickable `div` cards are not
keyboard-operable; modals have no focus trap, `role="dialog"` or Escape handling;
emoji used as the only icon in places; no visible custom focus style beyond input rings;
status conveyed by colour + text (acceptable).

**States:** spinners and empty states exist on most lists; errors mostly via toast;
no retry actions; several `console.error` paths without user feedback (Admin).

**Build/lint:** `vite build` succeeds (Verified). `eslint .` **fails: 9 errors,
11 warnings** (unused vars, setState-in-effect, fast-refresh exports, missing hook deps).

### Design assessment
The existing direction — teal primary, slate neutrals, white cards with 1px borders,
generous radius, simple iconography — is calm, legible and appropriate for healthcare.
**Preserve** the palette, card language and two-panel login. **Improve**: replace
ad-hoc class strings with a small token set (`@theme` in Tailwind 4) and ~8 shared
primitives (Button, Input/Field, Select, Card, Badge, Modal, Tabs, Table/EmptyState);
remove emoji-as-icons; unify brand name and `<title>`; make the home page reflect what
the product actually does (it currently promises "medical records" and "diagnoses"
the Java backend does not implement); fix patient-view data bugs before polishing
visuals; add responsive table → card fallbacks and accessible tabs/modals.

---

## 6. Security concerns (prioritised)

| # | Severity | Finding | Evidence |
|---|---|---|---|
| S1 | **Critical** | Production DB host + password committed (`dotnetapi/appsettings.json`, since `bac30a3`) | Code-read |
| S2 | **Critical** | .NET API: every endpoint anonymous, `AllowAnyOrigin`, Swagger public; `GET /api/Users` returns password hashes; CRUD on all clinical tables; shares prod DB | Code-read (live host not probed) |
| S3 | High | README publishes historical default admin credentials; if that account still exists in prod it must be rotated | Code-read; prod Unverified |
| S4 | High | Broken function/object-level authz on appointment status & doctor schedules | Verified |
| S5 | High | Internal exception messages returned to clients (NPE text, parser text; SQL text likely) | Verified |
| S6 | High | No login rate-limiting / lockout | Verified |
| S7 | Medium | 6-character generated patient passwords; no change/reset flow | Verified |
| S8 | Medium | 403 instead of 401 for unauthenticated; no `WWW-Authenticate` | Verified |
| S9 | Medium | No locking on stock decrement, payments, bill-per-appointment → races | Code-read |
| S10 | Medium | Client-supplied prices for charges (doctor/receptionist) | Code-read |
| S11 | Medium | Long-lived (24 h example) bearer tokens in `localStorage`, no revocation | Code-read |
| S12 | Medium | `ddl-auto=update` against prod; dual schema owners | Code-read |
| S13 | Low | Hard-coded localhost CORS origins in code; `allowCredentials=true` (not used — bearer tokens) | Code-read |
| S14 | Low | JWT filter logs attacker-controlled token fragments at ERROR | Verified |
| S15 | Low | Admin can demote/disable self (lockout) | Verified |
| S16 | Low | No security headers (CSP, HSTS, X-Content-Type-Options) in nginx | Code-read |

---

## 7. Baseline verification (2026-10-16)

| Check | Command | Result |
|---|---|---|
| Backend compile | `./mvnw -B -DskipTests compile` | **Pass** |
| Backend tests (no profile) | `./mvnw -B test` | **Fail** — `Failed to configure a DataSource` (base `application.properties` has no datasource; config only in `docker` profile) |
| Backend tests (`SPRING_PROFILES_ACTIVE=docker`, throwaway Postgres 16) | `./mvnw -B test` | **Pass** — 1 test (`contextLoads`) |
| Backend runtime probe | local app on :18080, throwaway DB, fictional data | Findings in §2, §4, §6 |
| Frontend build | `npx vite build` (to scratch dir) | **Pass** (382 kB JS, 35 kB CSS) |
| Frontend lint | `npx eslint .` | **Fail** — 9 errors, 11 warnings |
| Frontend tests | — | None exist |
| .NET build | — | **Not run** (`dotnet` SDK not installed) |
| Production schema | — | **Not inspected** (no authorised access used) |

Warnings observed at startup: explicit `PostgreSQLDialect` deprecated;
`spring.jpa.open-in-view` enabled by default; AuthenticationProvider/UserDetailsService
double configuration.

---

## 8. Documentation accuracy
`README.md` is out of date in several places: default admin credentials (seeder now
uses env vars), `.NET 8` (is .NET 10), `Vite 6` (is 8), Java 25 vs pom target 21,
`/api/admin/doctors`, `/api/bills/{id}/pay`, `/api/bills/from-prescription`,
"Prescriptions & Drugs (.NET via nginx proxy)" (now served by Spring), project tree
lists `dotnetapi/Services/` (does not exist).
