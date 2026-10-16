# Phase 2 — Backend Correctness, Integrity and Observability: Report

- **Date:** 2026-10-16 · **Branch:** `main` · **Nothing committed, pushed or deployed.**
- **No production system accessed. No schema changes:** no entity, table, column or constraint
  was added or altered, and there is no Flyway in the running app (D3). The .NET API is untouched.
- Builds on Phase 1a (booking, billing, auth, state machine) and 1a-2 (server-side drug charges,
  stock locking). Those already covered the roadmap's Phase 2 items for transitions,
  double-booking, concurrency and server pricing; this phase covers the remainder that could be
  done without schema changes.

## 1. What changed

### 1.1 Request IDs and a stable error contract (for web and the Flutter client)
- `RequestIdFilter` (runs before Spring Security):
  - every response carries `X-Request-Id`;
  - a client-supplied id is kept only if it matches `[A-Za-z0-9._-]{1,64}`, otherwise a UUID is generated, which prevents log or header injection;
  - the id is in the logging MDC, and every log line shows `[requestId]`.
- Error responses gain two **additive** fields: `code` (stable, machine-readable; `exception/ErrorCodes.java`) and `requestId`. `message`, `errors` and `timestamp` are unchanged, so existing clients are unaffected.
- **Codes:**
  - generic: `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`, `VALIDATION_FAILED`, `MALFORMED_REQUEST`, `METHOD_NOT_ALLOWED`, `UNSUPPORTED_MEDIA_TYPE`, `CONFLICT`, `INVALID_STATE_TRANSITION`, `CONCURRENT_UPDATE`, `INTERNAL_ERROR`;
  - specific: `SLOT_UNAVAILABLE`, `DUPLICATE_ACCOUNT`, `DUPLICATE_PAYMENT_REFERENCE`, `INSUFFICIENT_STOCK`, `DRUG_NOT_PRICED`, `ALREADY_PRESCRIBED`, `APPOINTMENT_NOT_ACTIVE`, `BILL_CANCELLED`, `BILL_HAS_PAYMENTS`, `ADMIN_SELF_CHANGE`, `INVALID_CURRENT_PASSWORD`.
- 401/403 written by the security filter chain carry the same `code` and `requestId`.

### 1.2 Log hygiene (no secrets or personal data in logs)
| Before | After |
|---|---|
| `spring.jpa.show-sql=true` in production profile | `false` |
| JWT filter logged every bad token at ERROR with parser text echoing token fragments | DEBUG, failure type only |
| Constraint violations logged the database detail (contains the offending values, e.g. emails) | Constraint **name** only |
| Lock failures logged the database message | Exception type only |
| Spring logged every resolved exception (DevTools on): validation failures include rejected field values | `spring.mvc.log-resolved-exception=false` |

Verified on a running instance: a registration with an invalid email and phone produced the
error response and **0** log occurrences of either value. The e2e run log had 0 ERROR lines,
0 token-parse lines and 0 SQL statements.

### 1.3 Clinic time zone
`TimeConfig` provides a clinic `Clock` (`app.clinic.timezone`, default `Africa/Nairobi`). The
business rules "today's appointments" and "can't book in the past" now use it. Previously they
used the server zone, and the production container runs in **UTC**, three hours behind the
clinic: before 03:00 EAT, "today" was yesterday's date, and times up to three hours in the past
were accepted. Audit timestamps (`createdAt`, `paidAt`, …) are deliberately unchanged, so stored
data keeps one meaning.

### 1.4 Admin safeguards
- An admin can't change their own role or disable their own account (409 `ADMIN_SELF_CHANGE`). This also guarantees at least one active admin remains, because whoever acts is an active admin.
- Roles change only between staff roles. Changing to or from Patient is 400: a patient account needs a patient record, which only reception registration creates. Staff-account creation can no longer create bare Patient accounts (previously the receptionist endpoint could).
- Promotion to Doctor creates the doctor profile that prescribing requires. This is idempotent. Previously a promoted doctor couldn't prescribe.

### 1.5 Prescription read scoping
| Endpoint | Before | After |
|---|---|---|
| `GET /api/prescriptions` (all) | any doctor | receptionist, admin |
| `GET /api/prescriptions/mine` | — | **new**, doctor: own prescriptions, newest first |
| `GET /api/prescriptions/{id}` | any doctor | front desk, or the prescribing doctor |
| `GET /api/prescriptions/doctor/{doctorProfileId}` | any doctor | front desk, or that doctor |
| `GET /api/prescriptions/appointment/{id}` | any doctor | front desk, the appointment's doctor, **or its patient** |

The doctor screen now uses `/mine` (frontend: `prescriptionService.getMine`, `DoctorDashboard`).

### 1.6 Passwords
- Generated patient passwords: 6 letters → **12 characters**, always including a digit, with no look-alike characters.
- **New** `POST /api/auth/change-password` `{currentPassword, newPassword}` (authenticated; new password 8–128 characters and different from the current one). A wrong current password is **400 `INVALID_CURRENT_PASSWORD`, never 401**, which clients would treat as session expiry.

### 1.7 Health endpoint
Spring Boot Actuator with **only** `/actuator/health` exposed, public (for load balancers and
container checks), returning `{"status":"UP"}` with no component details. `env`, `beans`,
`configprops`, `heapdump` and `info` return 404 even for admins.

### 1.8 Documents
- `docs/database-migration-strategy.md`: the D3 procedure (authorised schema-only dump → isolated restore → compare with `validate` → data checks → V1 baseline → separately approved constraint migrations → `validate`), with the read-only data-check queries.
- `docs/database/hibernate-expected-schema.sql`: the schema the entities expect, generated, as the reference for that comparison.
- `docs/dotnet-retirement-plan.md`: the D4 plan.
  - Consumers: the web app no longer uses it; the nginx routes are dead; external users are unknown.
  - **Likely real dependency:** drug catalogue maintenance; Spring has no drug create/update endpoints.
  - Covers data responsibilities and staged decommissioning with rollback.

## 2. Tests

New tests were written first and run against the unchanged code: **25 of 27 failed**. The two
that passed are intentional controls ("admin can still manage other admins", "other actuator
endpoints not exposed").

| Class | Tests | Before | After |
|---|---|---|---|
| `RequestIdAndErrorContractIntegrationTest` | 8 | 8 failed | pass |
| `ClinicTimeZoneIntegrationTest` (fixed clock: 01:30 EAT = 22:30 UTC the previous day) | 2 | 2 failed | pass |
| `AdminSafeguardsIntegrationTest` | 6 | 5 failed | pass |
| `PrescriptionReadScopingIntegrationTest` | 5 | 5 failed | pass |
| `PasswordIntegrationTest` | 5 | 5 failed | pass |
| `HealthEndpointIntegrationTest` | 2 | 1 failed | pass |

One expectation was corrected after implementation: a duplicate registration returns the
specific `DUPLICATE_ACCOUNT` code, where the test had expected generic `CONFLICT`. That is the
intended design, not a weakened test.

| Check | Before Phase 2 | After |
|---|---|---|
| Backend suite (Testcontainers PostgreSQL) | 72 pass | **100 / 100 pass** (clean build, and again after the last config change) |
| Browser e2e (Playwright, local backend on the Phase 2 code) | 22 pass | **22 / 22 pass** |
| Frontend build | pass | pass |
| Frontend lint | 4 errors (pre-existing) | 4 errors (same files) |

## 3. Client-visible changes
| Change | Impact |
|---|---|
| Error bodies have `code`, `requestId`; responses have `X-Request-Id` | Additive |
| Doctors get 403 on `GET /api/prescriptions` | Web switched to `/mine` |
| Patients can read prescriptions for their own appointment by id | Additive |
| Role changes involving Patient → 400; self-change → 409 | Admin UI already disabled self-change |
| Receptionist endpoint can't create Patient accounts | Not used by the web app |
| "Today"/"past" follow EAT | Correct for users; visible only between 00:00 and 03:00 EAT |

## 4. Not done in this phase (and why)
| Item | Reason / what's needed |
|---|---|
| Flyway, DB constraints, indexes | D3: needs the authorised schema dump and reconciliation (strategy written) |
| "Must change temporary password" flag | Needs a new column (schema change) |
| Prescription void/cancel status instead of hard delete | Needs a status column (schema change) |
| `timestamptz` storage | Schema change; the clinic clock covers the business rules meanwhile |
| Login rate limiting, refresh tokens, revocation (tokens stay valid after a password change) | Authentication work, planned for Phase 3 (D5) |
| Web UI for change-password | Endpoint ready; a small UI addition when you want it |
| Check-in only on the appointment's day; slot length | Product decisions (still open) |
| Drug catalogue management endpoints | Needed before .NET retirement (D4 plan, step 3); new feature, needs approval |

## 5. Files
- **New (main):** `observability/RequestIdFilter.java`, `exception/ErrorCodes.java`, `config/TimeConfig.java`, `security/PrescriptionSecurity.java`, `dto/ChangePasswordRequest.java`.
- **Modified (main):**
  - `ApiResponse`, `GlobalExceptionHandler`, `ConflictException`, `DuplicateResourceException`, `InvalidRequestException`;
  - `JsonSecurityErrorHandler`, `JwtAuthenticationFilter`, `SecurityConfig`;
  - `AppointmentService`, `AuthService`, `BillService`, `PatientService`, `PrescriptionService`, `UserService`;
  - `AdminController`, `AuthController`, `PrescriptionController`;
  - `application.properties`, `application-docker.properties`, `pom.xml` (actuator).
- **Tests:** 6 new classes (above).
- **Frontend:** `api/prescriptionService.js`, `pages/DoctorDashboard.jsx`, `features/doctor/DoctorPrescriptionsPanel.jsx`.
- **Docs:** this report, `database-migration-strategy.md`, `database/hibernate-expected-schema.sql`, `dotnet-retirement-plan.md`.
- The commented-out legacy code in `AppointmentService` was left exactly as it was. A bulk replacement had touched one commented line; it was restored.

Production security containment (`security-incident-checklist.md`) remains open.
