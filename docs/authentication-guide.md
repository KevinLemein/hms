# Authentication Guide

How clients (the web app and the Flutter app) sign in to the MediCare API, and the current
limitations. Everything here was verified against a running local backend on 2026-10-16
unless marked otherwise.

## 1. The flow

MediCare uses **first-party email + password sign-in** that returns a **JWT bearer token**.
It is not OAuth 2.0: there are no clients, client secrets, redirects or grant types. Nothing
secret needs to be built into the mobile app.

```
POST /api/auth/login            { email, password }
  200 -> data: { token, type: "Bearer", id, username, email, role, firstName, lastName, expiresAt }
  401 -> code: INVALID_CREDENTIALS   (wrong email/password, or account disabled)

Every other request:
  Authorization: Bearer <token>
```

### Example (fictional)
```http
POST /api/auth/login
Content-Type: application/json

{ "email": "zawadi.njeri@example.test", "password": "Example#Pass2026" }
```
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzUxMiJ9.eyJyb2xlIjoiUk9MRV9QQVRJRU5UIiwi...",
    "type": "Bearer",
    "id": 15,
    "username": "zawadinjeri",
    "email": "zawadi.njeri@example.test",
    "role": "ROLE_PATIENT",
    "firstName": "Zawadi",
    "lastName": "Njeri",
    "expiresAt": "2026-11-03T07:30:00Z"
  },
  "timestamp": "2026-11-02T10:30:00.123"
}
```

## 2. The token
- **Format:** JWT signed with HS256 using the server's `JWT_SECRET`. Claims: `sub` (email), `role`, `userId`, `iat`, `exp`. Treat it as **opaque**: don't make decisions from its claims; use the login response or `GET /api/auth/me`.
- **Lifetime:** set by the server's `JWT_EXPIRATION` (milliseconds). The README's example is 24 hours, but check the deployment's value. The login response returns `expiresAt` as an ISO-8601 UTC instant.
- **Checked on every request:** signature, expiry, and that the account still exists and is **enabled**. Disabling an account makes its tokens fail immediately (401), even unexpired ones.
- **Role changes** take effect on the next request: the role is read from the database, not from the token.

## 3. Client behaviour

| Situation | Response | What the client should do |
|---|---|---|
| No token, malformed, expired, account disabled | **401** `UNAUTHENTICATED`, `WWW-Authenticate: Bearer` | Discard the token and show sign-in ("session expired") |
| Signed in but not allowed | **403** `FORBIDDEN` | Show a permission message. **Do not** sign out |
| Wrong password at sign-in | **401** `INVALID_CREDENTIALS` | Show "incorrect email or password". It is not a session expiry |
| Wrong *current* password when changing it | **400** `INVALID_CURRENT_PASSWORD` | Show the field error; the session stays valid |

- **App start / session restore:** if a token is stored and `expiresAt` hasn't passed, call `GET /api/auth/me`. 200 means continue, with the user's id, role and names; 401 means sign in.
- **Before expiry:** there is no refresh (see §5). When `expiresAt` passes, or on any 401, ask the user to sign in again.

## 4. Logout, password change, revocation
- **Logout** is client-side: delete the stored token. There is no server logout endpoint, and the server **cannot revoke** a token: a copied token keeps working until `expiresAt`.
- **`POST /api/auth/change-password`** `{ currentPassword, newPassword }` (signed in; new password 8–128 characters and different from the current one). After a change, the old password no longer signs in, but **tokens issued before the change remain valid until they expire** (verified).
- **Disabling the account** (admin) is the only way to cut off existing tokens immediately.
- Patients receive a generated temporary password (12 characters) at registration. There is not yet a forced "change on first sign-in".

## 5. Limitations and the agreed position
Decision (Phase 3): **no refresh tokens yet**. A server-side refresh-token store needs either a
new database table (a schema change, blocked by D3 until the Flyway baseline exists) or an
in-memory store, which was not chosen.

Consequences for clients:
1. Sessions last exactly the access-token lifetime, then the user signs in again.
2. Logout and password changes don't revoke issued tokens.
3. A long lifetime is convenient but means a leaked token is useful for longer. Store tokens only in secure storage (below).

**Proposed design when approved** (no client secret, no Resource Owner Password grant, and it
works for web and Flutter alike):
- `POST /api/auth/login` additionally returns an opaque `refreshToken` (random, 256 bits). It is stored only as a hash, with expiry and user.
- Access tokens become short-lived (e.g. 15 minutes).
- `POST /api/auth/refresh` `{ refreshToken }` returns a new access token and a **new** refresh token, and invalidates the old one (rotation). Reuse of an already-rotated token revokes that whole session family (theft detection).
- `POST /api/auth/logout` revokes the refresh token.
- A password change or disabled account revokes all of the user's refresh tokens.
- Login rate limiting per account and per IP.

Storage needs a `refresh_tokens` table, added through the approved Flyway process.

## 6. Mobile (Flutter) specifics
- Store the token in **secure storage** (Android Keystore / iOS Keychain, e.g. `flutter_secure_storage`). Never store it in plain preferences, logs or crash reports.
- Never embed passwords, `JWT_SECRET` or any other server secret in the app. None is needed.
- Native HTTP clients are **not** subject to CORS. CORS only restricts browsers.
- Use HTTPS in every non-local environment. The server does not terminate TLS itself; nginx or the platform does.
- Optionally send your own `X-Request-Id` (letters, digits, `.`, `_`, `-`; up to 64 characters) to correlate app logs with server logs. Otherwise read the one the server returns.

## 7. Roles

| Role | Signs in to | Notes |
|---|---|---|
| `ROLE_PATIENT` | Patient app / patient web view | Accounts are created by reception registration, never self-registered |
| `ROLE_DOCTOR` | Doctor screens | Created by an admin or receptionist |
| `ROLE_RECEPTIONIST` | Reception screens | Created by an admin or receptionist |
| `ROLE_ADMIN` | Administration | First admin seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` |

The Flutter app is for patients, so it should reject (sign out) any role other than `ROLE_PATIENT`
after sign-in. The server enforces permissions regardless.
