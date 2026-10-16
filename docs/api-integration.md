# API Integration Guide (for the Flutter patient app)

Everything a client needs to use the MediCare API without reading the backend code. All
examples use **fictional** data. Schemas: [`openapi.json`](openapi.json) (generated from the
code, kept in sync by a test) or Swagger UI (§9). Sign-in details:
[`authentication-guide.md`](authentication-guide.md). Every endpoint:
[`api-reference.md`](api-reference.md).

## 1. What the API supports today (scope D1)
MediCare is a clinic system. For **patients** the API supports:
- signing in;
- viewing their profile;
- viewing their appointments;
- viewing their prescriptions;
- viewing their bills and payments;
- changing their password.

**Not available** (no endpoints exist, so don't build screens for them):
- self-registration (patients are registered at reception, which issues a temporary password);
- booking, cancelling or rescheduling appointments (done by reception);
- a physician directory, search or profiles;
- consultations or messaging;
- notifications or push;
- online payment (payments are recorded by staff; M-Pesa codes are entered at the desk);
- editing the profile (reception corrects details);
- refresh tokens.

## 2. Base URL and environments
| Environment | Base URL | Notes |
|---|---|---|
| Local backend (developer machine) | `http://<host-ip>:8080/api` | Docker compose publishes the backend on host port **8081** (`http://<host-ip>:8081/api`). From an Android emulator, the host is `10.0.2.2` |
| Behind nginx (docker / deployed web) | `https://<site>/api` | nginx routes `/api/` to the backend |

Make the base URL a build-time or runtime setting. Never hard-code `localhost`.

## 3. Requests
- JSON in and out: `Content-Type: application/json`.
- `Authorization: Bearer <token>` on every request except `POST /api/auth/login`.
- Optional `X-Request-Id: <your id>` (`[A-Za-z0-9._-]`, at most 64 characters). It is echoed back; otherwise the server generates one.
- IDs are integers (64-bit).

## 4. Responses: one envelope
```json
{ "success": true, "message": "Patient appointments", "data": [ ... ], "timestamp": "2026-11-02T10:30:00.123" }
```
Errors:
```json
{
  "success": false,
  "code": "VALIDATION_FAILED",
  "message": "Please provide a valid email address",
  "errors": { "email": "Please provide a valid email address" },
  "requestId": "7c1e0f4a-2b9d-4c55-9a51-3f0b8e6d2a10",
  "timestamp": "2026-11-02T10:30:00.123"
}
```
- Read `data` on success. `message` is human-readable and may change.
- **Branch on HTTP status and `code`, never on `message`.**
- `errors` (field → message) appears only for `VALIDATION_FAILED`.
- Show or log `requestId` in error reports: support staff can find the exact request in the server logs.
- **Ignore unknown fields.** New optional fields can be added at any time.
- A field that has no value may be **absent or `null`**; handle both. For example, prescription fields such as `billId`, `notes` and `drugName` are `null` when not applicable.

### Status codes and error codes
| HTTP | Typical `code` | Meaning for the app |
|---|---|---|
| 400 | `VALIDATION_FAILED`, `BAD_REQUEST`, `MALFORMED_REQUEST`, `INVALID_CURRENT_PASSWORD` | Fix the input; show the message or field errors |
| 401 | `UNAUTHENTICATED` | Token missing, invalid or expired: go to sign-in |
| 401 | `INVALID_CREDENTIALS` | Only from `/auth/login`: wrong email or password |
| 403 | `FORBIDDEN` | Not allowed. **Not** a session expiry |
| 404 | `NOT_FOUND` | Doesn't exist (or unknown route) |
| 405 / 415 | `METHOD_NOT_ALLOWED` / `UNSUPPORTED_MEDIA_TYPE` | Client bug |
| 409 | `CONFLICT`, `INVALID_STATE_TRANSITION`, `CONCURRENT_UPDATE`, and specific codes (`SLOT_UNAVAILABLE`, `INSUFFICIENT_STOCK`, `DUPLICATE_PAYMENT_REFERENCE`, …) | Request is valid but conflicts with current data. `CONCURRENT_UPDATE` is safe to retry |
| 500 | `INTERNAL_ERROR` | Generic message; report the `requestId` |

The full list of codes is in `openapi.json` (`components.schemas.ErrorResponse`). New codes may
be added, so treat an unknown code by its HTTP status.

## 5. Dates, times and money
- **Appointment and record times** (`appointmentDateTime`, `createdAt`, `createdOn`, `paidAt`, …) are **local date-times without a zone**, e.g. `"2026-11-03T09:30:00"`. Appointment times are **clinic time (Africa/Nairobi, UTC+3)**. Display them as-is; don't convert from UTC.
- **`expiresAt`** (login) is an **instant in UTC**, e.g. `"2026-11-03T07:30:00Z"`.
- Dates of birth are `"yyyy-MM-dd"`.
- Money is a JSON number in **KES** with 2 decimals (`500.00`). Use a decimal type, never binary floating point, for arithmetic.

## 6. Pagination
Paged endpoints accept `?page=0&size=20&sort=field,asc` (0-based) and return:
```json
{ "content": [ ... ], "page": 0, "size": 20, "totalElements": 57, "totalPages": 3, "last": false }
```
Paged: `GET /api/patients`, `GET /api/bills`, `GET /api/admin/users` (staff only). **All patient
endpoints return plain lists**: a patient's own records are small and returned complete.

## 7. Patient app: feature → endpoint map

| Feature | Endpoint | Verified |
|---|---|---|
| Sign in | `POST /api/auth/login` | Integration tests + browser + live |
| Restore session / who am I | `GET /api/auth/me` | Integration test + live |
| Profile (name, contact, DOB, gender, address, allergies, emergency contact) | `GET /api/patients/me` | Integration test + browser + live |
| My appointments (newest first) | `GET /api/patients/me/appointments` | Integration test + browser + live |
| My prescriptions (with drug and doctor names; newest first) | `GET /api/patients/me/prescriptions` | Integration test + browser + live |
| My bills (line items, payments, balance) | `GET /api/patients/me/bills` | Integration test + browser + live |
| Change password | `POST /api/auth/change-password` | Integration test + live |
| Sign out | *(client-side: delete the token)* | n/a |

"Live" = exercised with curl against a running local backend on 2026-10-16.

### 7.1 Profile
`GET /api/patients/me`
```json
{
  "success": true, "message": "Patient retrieved",
  "data": {
    "id": 12, "userId": 15,
    "firstName": "Zawadi", "lastName": "Njeri",
    "email": "zawadi.njeri@example.test", "username": "zawadinjeri",
    "phoneNumber": "0700100200", "dateOfBirth": "1990-04-12", "gender": "FEMALE",
    "address": "Westlands, Nairobi",
    "emergencyContactName": "Baraka Njeri", "emergencyContactPhone": "0700300400",
    "allergies": "Penicillin", "enabled": true,
    "createdAt": "2026-10-01T08:12:40.511",
    "generatedPassword": null
  },
  "timestamp": "2026-11-02T10:30:00.123"
}
```
`gender` is `MALE`, `FEMALE` or `OTHER`. Show `allergies` prominently when present.
`generatedPassword` is always `null` here; it is filled only once, in the staff registration
response.

### 7.2 Appointments
`GET /api/patients/me/appointments` returns a list of:
```json
{
  "id": 31, "patientId": 12, "patientFirstName": "Zawadi", "patientLastName": "Njeri",
  "patientEmail": "zawadi.njeri@example.test", "patientPhone": "0700100200",
  "doctorId": 4, "doctorFirstName": "Amani", "doctorLastName": "Kamau",
  "appointmentDateTime": "2026-11-03T09:30:00",
  "reason": "Persistent cough",
  "appointmentStatus": "PENDING",
  "notes": null,
  "createdAt": "2026-10-28T14:02:11.090"
}
```

| `appointmentStatus` | Suggested label |
|---|---|
| `PENDING` | Booked |
| `WAITING` | Checked in |
| `IN_CONSULTATION` | In consultation |
| `COMPLETED` | Completed |
| `CANCELLED` | Cancelled |
| `NO_SHOW` | Missed |

"Upcoming" = `PENDING` or `WAITING`. Patients can't change appointments.

### 7.3 Prescriptions
`GET /api/patients/me/prescriptions` returns a list of:
```json
{
  "id": 88, "appointmentId": 31, "doctorId": 2, "drugId": 7,
  "drugName": "Amoxicillin", "drugMilligrams": 500,
  "dossage": "1 capsule", "duration": "3 times a day for 5 days", "notes": "Take after meals",
  "quantity": 15, "createdOn": "2026-11-03T09:52:10.004",
  "prescribedByFirstName": "Amani", "prescribedByLastName": "Kamau",
  "appointmentDateTime": "2026-11-03T09:30:00",
  "billId": null, "chargeAmount": null
}
```
Note the field name **`dossage`** (spelled this way in the API). `doctorId` here is a doctor
*profile* id; use the name fields for display.

### 7.4 Bills
`GET /api/patients/me/bills` returns a list of:
```json
{
  "id": 40, "appointmentId": 31, "patientId": 12,
  "patientFirstName": "Zawadi", "patientLastName": "Njeri", "patientPhone": "0700100200",
  "status": "PARTIALLY_PAID",
  "totalAmount": 2300.00, "amountPaid": 500.00, "balance": 1800.00,
  "lineItems": [
    { "id": 101, "description": "Consultation Fee", "quantity": 1, "unitPrice": 500.00, "totalPrice": 500.00,
      "source": "CONSULTATION", "sourceReferenceId": 31, "createdAt": "2026-10-28T14:02:11.120" },
    { "id": 102, "description": "Amoxicillin (500 mg)", "quantity": 15, "unitPrice": 120.00, "totalPrice": 1800.00,
      "source": "DRUG_DISPENSE", "sourceReferenceId": 88, "createdAt": "2026-11-03T09:52:10.020" }
  ],
  "payments": [
    { "id": 9, "amount": 500.00, "method": "MPESA", "reference": "SHK7Y2M4XR",
      "recordedByUserId": 3, "paidAt": "2026-10-28T14:05:00.000" }
  ],
  "createdAt": "2026-10-28T14:02:11.100", "updatedAt": "2026-11-03T09:52:10.030"
}
```
- `status`: `OPEN` (unpaid), `PARTIALLY_PAID`, `PAID`, `CANCELLED`.
- `source`: `CONSULTATION`, `DRUG_DISPENSE`, `LAB`, `MANUAL`.
- `method`: `CASH`, `MPESA`, `CARD`, `INSURANCE`.
- Show the balance due when `OPEN` or `PARTIALLY_PAID` with `balance > 0`, plus "pay at the reception desk". There is no in-app payment.

### 7.5 Change password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
{ "currentPassword": "Example#Pass2026", "newPassword": "A-new-Example#2026" }
```

| Result | Response |
|---|---|
| Success | 200 `{ "success": true, "message": "Password changed" }` |
| Wrong current password | 400 `INVALID_CURRENT_PASSWORD` |
| Too short or long (8–128) | 400 `VALIDATION_FAILED` with `errors.newPassword` |
| Same as current | 400 `BAD_REQUEST` |

## 8. Compatibility policy (no API versioning, by decision)
The API stays at `/api/...` without a version prefix. To keep released apps working:
- Changes are **additive only**: new endpoints, new optional response fields, new error codes, new optional query parameters.
- Existing fields are not renamed, removed or retyped, and existing status codes for existing outcomes don't change.
- If a breaking change ever becomes necessary, it must be introduced as a new endpoint (or a versioned path) alongside the old one, with a deprecation period agreed with the mobile team.
- Clients: ignore unknown fields; handle unknown error codes by HTTP status; handle `null` and absent fields alike.

## 9. Interactive docs (local)
Run the backend locally (see `README.md` / `frontend/e2e/README.md`) **without** the docker
profile, or with `API_DOCS_ENABLED=true`, then open:
- Swagger UI: `http://localhost:<port>/swagger-ui.html` (use **Authorize** and paste a token)
- OpenAPI JSON: `http://localhost:<port>/v3/api-docs`

The docs are **off in the production profile** by default. The committed `docs/openapi.json`
is checked by a test to match the code.

## 10. Known limitations (as of 2026-10-16)
- No refresh tokens: sign in again at `expiresAt`. Logout and password change don't revoke existing tokens.
- No login rate limiting yet.
- No server time zone in timestamps (§5).
- Patient lists aren't paged (fine for one patient's records).
- Production (shared database, exposed .NET API) has open security actions (`security-incident-checklist.md`). Don't connect a released app to production until they're closed.
