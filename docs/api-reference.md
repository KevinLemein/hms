# API Reference

All client-facing endpoints of the Spring Boot service (the only supported API; the legacy
.NET API is not part of the contract, see `dotnet-retirement-plan.md`).

- **Schemas, fields and examples:** [`openapi.json`](openapi.json), generated from the controllers; a test fails if it drifts from the code. Swagger UI locally: see `api-integration.md` §9.
- **Conventions** (envelope, error codes, dates, pagination, compatibility): [`api-integration.md`](api-integration.md).
- **Sign-in:** [`authentication-guide.md`](authentication-guide.md).
- **Base path:** `/api`. Every endpoint except `POST /api/auth/login` requires `Authorization: Bearer <token>`.
- **Roles:** P = patient, D = doctor, R = receptionist, A = admin. "Own" = only the caller's own records (checked on the server; changing an id in the URL returns 403).
- **Every error** uses the envelope with `code` and `requestId`. Every authenticated endpoint can also return 401 `UNAUTHENTICATED` and 403 `FORBIDDEN`. The table lists only the endpoint-specific outcomes.
- **Verified** (as of 2026-10-16):
  - **IT** = backend integration test (Testcontainers PostgreSQL);
  - **E2E** = Playwright browser test;
  - **Live** = curl against a running local backend;
  - **—** = implemented and in the spec, but not directly exercised by a test.

## Authentication
| Method | Path | Who | Purpose | Notable responses | Verified |
|---|---|---|---|---|---|
| POST | `/auth/login` | public | Sign in → token, role, names, `expiresAt` | 401 `INVALID_CREDENTIALS` | IT, E2E, Live |
| GET | `/auth/me` | any signed-in | Current user (session check) | — | IT, Live |
| POST | `/auth/change-password` | any signed-in | Change own password | 400 `INVALID_CURRENT_PASSWORD`, `VALIDATION_FAILED` | IT, Live |

## Patient self-service (for the patient app)
| Method | Path | Who | Purpose | Verified |
|---|---|---|---|---|
| GET | `/patients/me` | P | Own profile | IT, E2E, Live |
| GET | `/patients/me/appointments` | P | Own appointments, newest first | IT, E2E, Live |
| GET | `/patients/me/prescriptions` | P | Own prescriptions with drug and doctor names | IT, E2E, Live |
| GET | `/patients/me/bills` | P | Own bills with line items and payments | IT, E2E, Live |

## Patients (staff)
| Method | Path | Who | Purpose | Notable responses | Verified |
|---|---|---|---|---|---|
| POST | `/patients/register` | R, A | Register a patient + sign-in account (response has one-time `generatedPassword`) | 409 `DUPLICATE_ACCOUNT`, 400 `VALIDATION_FAILED` | IT, E2E |
| GET | `/patients` | R, A, D | List (paged: `page`, `size`, `sort`) | — | IT |
| GET | `/patients/{id}` | R, A, D | One patient | 404 | IT |
| GET | `/patients/by-user/{userId}` | R, A, D; P own | Patient by user id | 403 for another patient | IT |
| GET | `/patients/search?query=` | R, A, D | Name/email/phone search (not paged) | 400 missing `query` | IT, E2E |

## Appointments
| Method | Path | Who | Purpose | Notable responses | Verified |
|---|---|---|---|---|---|
| POST | `/appointments` | R | Book (also creates the bill + consultation fee) | 409 `SLOT_UNAVAILABLE`; 400 past time or bad date; 400 doctor disabled / not a doctor | IT, E2E |
| PATCH | `/appointments/{id}/status` | R, A: any allowed; D: own, to `IN_CONSULTATION`/`COMPLETED` | Change status `{ status, notes? }` | 409 `INVALID_STATE_TRANSITION`; 403 other doctor's; 400 unknown status | IT, E2E |
| GET | `/appointments` | R, A | All appointments (not paged) | — | E2E |
| GET | `/appointments/today` | R, A | Today (clinic date), all doctors | — | IT |
| GET | `/appointments/{id}` | R, A; D own; P own | One appointment | 403 | IT |
| GET | `/appointments/doctor/{doctorUserId}` | R, A; D own | A doctor's appointments | 403 another doctor | IT |
| GET | `/appointments/doctor/{doctorUserId}/today` | R, A; D own | A doctor's appointments today | 403 another doctor | IT, E2E |
| GET | `/appointments/patient/{patientId}` | R, A, D; P own | A patient's appointments | 403 another patient | IT |

## Prescriptions
| Method | Path | Who | Purpose | Notable responses | Verified |
|---|---|---|---|---|---|
| POST | `/prescriptions` | D (own appointment) | Prescribe = dispense + bill (server-priced); identical retry → **200** with the existing one | 409 `INSUFFICIENT_STOCK`, `DRUG_NOT_PRICED`, `ALREADY_PRESCRIBED`, `APPOINTMENT_NOT_ACTIVE`, `BILL_CANCELLED`; 403 not the appointment's doctor | IT, E2E |
| GET | `/prescriptions` | R, A | All prescriptions | — | IT |
| GET | `/prescriptions/mine` | D | Prescriptions I issued | — | IT, E2E |
| GET | `/prescriptions/{id}` | R, A; prescribing D | One prescription | 403 | IT |
| GET | `/prescriptions/doctor/{doctorProfileId}` | R, A; that D | By doctor **profile** id | 403 | IT |
| GET | `/prescriptions/appointment/{appointmentId}` | R, A; the appointment's D or P | For one appointment | 403 | IT |
| PUT | `/prescriptions/{id}` | prescribing D | Edit dosage, duration, notes | 403 | IT |
| DELETE | `/prescriptions/{id}` | prescribing D, A | Delete: restores stock and removes its charge | 409 `BILL_HAS_PAYMENTS`; 403 | IT |

## Billing
| Method | Path | Who | Purpose | Notable responses | Verified |
|---|---|---|---|---|---|
| POST | `/bills` | D, R, A | Create (or return the appointment's existing) bill | 400 appointment belongs to another patient | IT |
| POST | `/bills/{billId}/items` | D, R, A | Staff-entered charge, `source` MANUAL or LAB only | 400 server-owned source; 400 cancelled/paid bill | IT, E2E |
| POST | `/bills/{billId}/payments` | R, A | Record payment `{ amount, method, reference? }` | 409 `DUPLICATE_PAYMENT_REFERENCE`; 400 over balance, missing reference for MPESA/CARD | IT, E2E |
| PATCH | `/bills/{billId}/cancel` | A | Cancel (text/plain reason) | 400 has payments | IT |
| GET | `/bills` | R, A | List, newest first (paged) | — | E2E |
| GET | `/bills/status/{status}` | R, A | By status (not paged) | 400 unknown status | — |
| GET | `/bills/appointment/{appointmentId}` | D, R, A | Bill for an appointment | 404 | — |
| GET | `/bills/patient/{patientId}` | R, A, D; P own | A patient's bills | 403 another patient | IT |
| GET | `/bills/{id}` | R, A | One bill | 404 | — |

## Drugs
| Method | Path | Who | Purpose | Verified |
|---|---|---|---|---|
| GET | `/drugs` | D, R, A | Catalogue with stock (`quantity`) and price (`cost`) | E2E |
| GET | `/drugs/{id}` | D, R, A | One drug | — |

There are no create/update endpoints for drugs (see `dotnet-retirement-plan.md`).

## Administration and reception staff tools
| Method | Path | Who | Purpose | Notable responses | Verified |
|---|---|---|---|---|---|
| POST | `/admin/users` | A | Create staff account (ADMIN, DOCTOR, RECEPTIONIST) | 400 role PATIENT; 409 `DUPLICATE_ACCOUNT` | E2E setup (API) |
| GET | `/admin/users` | A | List users (paged) | — | IT, E2E |
| GET | `/admin/users/role/{role}` | A | Users by role (not paged) | 400 unknown role | — |
| PATCH | `/admin/users/{id}/role` | A | Change role `{ role }`, staff roles only | 409 `ADMIN_SELF_CHANGE`; 400 involving PATIENT | IT |
| PATCH | `/admin/users/{id}/toggle-status` | A | Enable/disable | 409 `ADMIN_SELF_CHANGE` | IT |
| POST | `/receptionist/users` | R | Create doctor/receptionist account | 400 role PATIENT | IT |
| GET | `/receptionist/doctors` | R | Doctors for booking forms | — | E2E |

## Not part of the client API
- `GET /actuator/health`: operational health check (`{"status":"UP"}`), public, no details.
- `/v3/api-docs`, `/swagger-ui.html`: documentation, disabled in production by default.

## Identifier pitfalls
- `doctorId` in **appointments** and `/appointments/doctor/{id}` is the doctor's **user id**.
- `doctorId` in **prescriptions** and `/prescriptions/doctor/{id}` is the doctor **profile id**.
- Patient apps never need either: use the `/me` endpoints and the name fields.
