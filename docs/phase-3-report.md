# Phase 3 — Client-Facing API Contract and Mobile Readiness: Report

- **Date:** 2026-10-16 · **Branch:** `main` · **Nothing committed, pushed or deployed.**
- **No production system accessed. No schema changes.** No Flyway. .NET API untouched.

## 1. Decisions (asked at the start of the phase)
| Question | Decision | Effect |
|---|---|---|
| Refresh-token storage | **No refresh tokens yet** | Sessions last the access-token lifetime; documented with a proposed design for later |
| API versioning | **Keep `/api` only** | Additive-only compatibility policy documented instead of `/api/v1` |
| Access-token lifetime | 15 min + web refresh, *if refresh tokens exist* | Not applicable yet; lifetime stays as configured (`JWT_EXPIRATION`) |

## 2. What changed

### 2.1 OpenAPI / Swagger UI (generated from the code)
- `springdoc-openapi` 3.0.2 (the Spring Boot 4 line). `config/OpenApiConfig.java` adds:
  - the **bearer-token** security scheme, applied globally; login is marked public;
  - a shared **`ErrorResponse`** schema whose `code` enum is generated from `ErrorCodes`, so it can't drift;
  - standard **400/401/403/404/409/500** responses on every operation;
  - a description of the envelope, the 401-vs-403 rule and the compatibility policy;
  - a relative server URL, so the same document fits every environment.
- Every one of the **46 operations** has an `@Operation` summary stating who may call it and its specific conflict codes, grouped by `@Tag`. Request DTOs carry **fictional** `@Schema` examples.
- Only `/api/**` is documented: Actuator and the error page are excluded. JSON is the declared content type.
- **Snapshot:** `docs/openapi.json` is committed. `ApiContractIntegrationTest` fails if it differs from what the code generates (regenerate with `-DupdateApiSpec=true`), so the docs can't silently diverge.
- **Production:** docs are **off** in the docker profile unless `API_DOCS_ENABLED=true`. Verified on a running instance: `/v3/api-docs` and `/swagger-ui.html` return 404.

### 2.2 CORS
- Origins come from `app.cors.allowed-origins`. Base default: `http://localhost:5173,http://localhost:3000`. The production profile uses `CORS_ALLOWED_ORIGINS`, **empty by default**: the SPA is same-origin behind nginx, so no cross-origin browser access is needed.
- Credentials mode is off (bearer tokens, not cookies). `X-Request-Id` is an allowed request header and is exposed to browser clients.
- Documented that CORS is not access control and that native apps aren't subject to it.

### 2.3 Mobile-oriented additions (additive)
- **`GET /api/auth/me`:** the current user; used to restore a session at app start.
- **`expiresAt`** (ISO-8601 UTC instant) in the login response.
- Removed the always-`null` `password` field from `UserResponse`. It never carried a value, and no client used it.

### 2.4 Documentation
| File | For |
|---|---|
| `docs/api-reference.md` | Inventory of all 46 operations: method, path, who may call it, purpose, notable responses, **how it was verified** (integration test / browser / live / none) |
| `docs/api-integration.md` | The Flutter developer: scope (what exists and what doesn't), base URLs, headers, envelope, error-code handling, dates/time zone/money, pagination, **feature → endpoint map** with fictional examples matching the real DTOs, compatibility policy, Swagger UI access, limitations |
| `docs/authentication-guide.md` | The sign-in flow, token checks, client behaviour per status, logout/password-change/revocation behaviour, limitations, secure storage on mobile, and a proposed refresh-token design (no client secret, no ROPC) for later approval |
| `docs/openapi.json` | Generated contract snapshot |
| `frontend/e2e/README.md` | Updated: the production profile needs `CORS_ALLOWED_ORIGINS` for the test harness |

## 3. Verification

| Check | Result |
|---|---|
| New tests (`ApiContractIntegrationTest` ×5, `CorsIntegrationTest` ×2) against the unchanged code | 5 of 7 failed. The 2 that passed: "other origins refused" (already true), and "no password field", which passed for the wrong reason (`jsonPath().doesNotExist()` also accepts `null`). It was rewritten to check the key itself, then failed as it should before the fix |
| Backend suite (clean build) | **107 / 107 pass** (100 before + 7) |
| Browser e2e (Phase 3 backend) | **22 / 22 pass**. One earlier run had a single failure caused by `net::ERR_NETWORK_CHANGED` on the host (blank page, scripts aborted). The rerun on a reset database passed fully |
| Live patient-app flow (curl, local backend, fictional data) | login (role, `expiresAt`) → `/auth/me` (no password field) → all four `/me` endpoints 200 → staff endpoint 403 `FORBIDDEN` + requestId → no token 401 + `WWW-Authenticate` + `X-Request-Id` → wrong current password 400 `INVALID_CURRENT_PASSWORD` → change 200 → old password 401 → **old token still 200** (documented limitation) → unknown CORS origin 403 |
| Production-profile docs | `/v3/api-docs` 404, `/swagger-ui.html` 404 |
| Frontend | No frontend code changed this phase |

## 4. Known limitations (documented for the mobile developer)
1. No refresh tokens. Logout and password change don't revoke issued tokens; disabling the account is the only immediate cut-off.
2. No login rate limiting (planned for Phase 4 security work).
3. Appointment and record times are zone-less clinic local times; only `expiresAt` is an instant.
4. Several staff list endpoints aren't paged (`/appointments`, `/bills/status/{status}`, `/patients/search`, `/admin/users/role/{role}`). Paging them would change their response shape, which the additive-only policy rules out without a new endpoint.
5. Field name `dossage` and two meanings of "doctorId" are part of the existing contract; documented rather than changed.
6. Five operations are implemented and in the spec but have no direct test (marked "—" in `api-reference.md`).
7. Patient features not in scope (self-booking, directory, notifications, online payment) have no endpoints; `api-integration.md` §1 says so explicitly.
8. Production security containment remains open. The integration guide says not to connect a released app to production until it's closed.

## 5. Files
- **New:**
  - `config/OpenApiConfig.java`;
  - tests `api/ApiContractIntegrationTest.java`, `api/CorsIntegrationTest.java`;
  - `docs/openapi.json`, `docs/api-reference.md`, `docs/api-integration.md`, `docs/authentication-guide.md`, this report.
- **Modified:**
  - `pom.xml` (springdoc); `SecurityConfig` (configurable CORS, docs paths, `/auth/me`);
  - `AuthController` (`/me`), `AuthService` / `JwtService` / `AuthResponse` (`expiresAt`), `UserService` (`getUser`), `UserResponse` (no password field);
  - all 8 controllers (`@Tag` / `@Operation` only), 10 request DTOs (`@Schema` examples only);
  - `application.properties`, `application-docker.properties`, `frontend/e2e/README.md`.

## 6. Post-phase fix (2026-10-16): browser sign-in refused behind nginx
**Symptom:** signing in from the web app (`docker compose`, http://localhost:3000) showed
"You don't have permission to do that" for every account.

**Cause (a regression from §2.2):**
- nginx forwarded `Host: localhost` (port dropped) and no forwarded port, so Spring saw the page's own origin `http://localhost:3000` as a different origin and applied CORS.
- §2.2 had changed the production profile's allowed origins from a hard-coded `localhost:3000` to "none", so Spring rejected the login with 403 "Invalid CORS request".
- Clients without an `Origin` header (curl, mobile) were unaffected, which is why the backend tests and live curl checks passed.

**Fix:**
- `frontend/nginx.conf` forwards `Host: $http_host`, `X-Forwarded-Host`, and `X-Forwarded-Port` (taken from the browser's Host header).
- The docker profile uses `server.forward-headers-strategy=native` (Tomcat trusts these headers only from private-network proxies such as the nginx container) and defaults `CORS_ALLOWED_ORIGINS` to `http://localhost:3000`.
- The login page no longer shows "permission" wording for a refused sign-in.

**Verified:**
- Reproduced first (403 "Invalid CORS request").
- Then, through a real nginx container running the repository config: same-origin login on a port **not** in the allow-list returned 200; a foreign origin still returned 403; requests without `Origin` returned 200.
- A real browser on http://localhost:3000 signed in as admin and reached User management (login and user list both 200).
- Backend suite 107/107; frontend build OK, lint unchanged.

**Deployment note:** rebuild **both** images (`docker compose up --build`). Under a real domain, set `CORS_ALLOWED_ORIGINS=https://<site>`. If TLS is terminated before nginx, also forward the original scheme.
