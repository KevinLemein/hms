# Security Incident — Containment & Remediation Checklist

- **Opened:** 2026-10-16 · **Source:** Phase 0 audit (`docs/implementation-audit.md` §6, S1–S3)
- **Status:** OPEN. **No production action has been taken.** Nothing in this
  document should be read as "production is secured" until the owner column is
  signed off by the responsible operator.
- **Constraint:** the engineer who wrote this did not access, probe or change any
  production system, credential or service.

## Incidents

| ID | Incident | Evidence | Severity |
|---|---|---|---|
| INC-1 | Production PostgreSQL host, username and password committed to Git | `dotnetapi/appsettings.json` → `ConnectionStrings:DefaultConnection`; tracked since commit `bac30a3` ("dotnet API"); present on `origin/main` | Critical |
| INC-2 | Deployed .NET API exposes the production DB without authentication | Every controller `[AllowAnonymous]`; CORS `AllowAnyOrigin`; Swagger UI enabled outside Development; `GET /api/Users` returns the `users` entity including `password` (BCrypt hash); full CRUD on patients, appointments, prescriptions, payments, medical records | Critical (source-confirmed; live host **not** probed) |
| INC-3 | Historical default admin credentials published in `README.md` | "Default Admin Login" section | High (whether the account exists in prod is unknown) |

## Affected configuration, consumers, dependencies

**Credential (INC-1)** — every system that connects to the production database with
that user:
- Spring Boot backend: reads `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` from the host's
  `.env` (not in Git). **Unknown whether it uses the same DB user** — operator to check.
- .NET API deployment: reads `appsettings.json` (the committed file) unless overridden
  by environment on the host.
- Any developer machines, IDE data sources, backups or BI tools configured with it.

**.NET API (INC-2)** — known consumers:
- `frontend/nginx.conf` proxies `/api/Prescriptions*` and `/api/Drugs*` (case-sensitive)
  to the external .NET host.
- **The web app does not call those paths any more**: it calls lower-case
  `/api/prescriptions` and `/api/drugs`, which nginx routes to Spring Boot (switched in
  commit `005bd1d`). No other repo code references the .NET host.
- Unknown external consumers: the API is public, so anyone who found it (Swagger UI is
  the landing page) may be using it. Its owner and the host's access logs are the only
  way to know.
- Data responsibilities: the .NET EF migrations created/altered several shared tables
  (`appointments`, `doctors`, `drugs`, `prescriptions`, `payments`, `users`, `patient`,
  `medical_records`, …). Turning the API **off** does not remove those tables or break
  the Spring service; it only stops the .NET writes. The drug catalogue currently has
  **no write endpoint in Spring** — if staff maintain drugs through the .NET API or its
  Swagger page, that workflow stops when it is shut down (use SQL or add a Spring
  endpoint in a later phase).

## Containment (do first — requires the API owner + DB operator)

| # | Action | Owner | Done / verified by |
|---|---|---|---|
| C1 | Restrict network access to the PostgreSQL server to the application hosts only (firewall / `pg_hba.conf`); deny public 5432 | DB operator | |
| C2 | Take the .NET API offline **or** block it at the edge (IP allow-list / basic auth in front of it) until it requires authentication. Coordinate with its owner first | .NET API owner | |
| C3 | Rotate the production DB password. Create **separate DB users per service** with least privilege; update the Spring host `.env` and (if kept) the .NET host config **outside Git**. Restart and confirm both connect | DB operator + service owners | |
| C4 | Revoke/rotate any other secret that has been in either repo's history (search history for `Password=`, `JWT_SECRET`, keys) | Repo owner | |
| C5 | Remove `nginx.conf` routes to the .NET host once C2 is decided (code change — will be done in-repo on request) | Repo owner | |

## Assessment (after containment)

| # | Action | Owner | Done |
|---|---|---|---|
| A1 | Review PostgreSQL connection logs (`log_connections`) and .NET host access logs since the first deploy for unknown source IPs and for requests to `/api/Users`, `PUT`/`POST`/`DELETE` on any controller | DB operator / host owner | |
| A2 | Because password hashes may have been read: force a password reset for all users (or at least staff/admin) and invalidate sessions (rotate `JWT_SECRET`, which logs everyone out) | Repo owner + operator | |
| A3 | Check data integrity of clinical/billing tables against backups for unexpected changes | DB operator | |
| A4 | Decide on notification obligations: patient health data may have been exposed. Kenya's Data Protection Act 2019 requires notifying the ODPC of personal-data breaches within 72 hours of becoming aware where there is a real risk of harm — **confirm with the data controller / legal**; this checklist is not legal advice | Data controller | |

## Old admin credential (INC-3) — controlled verification

Do **not** try the README credentials against the production login endpoint (that
would be an unauthorised access attempt and would add noise to the logs).
Instead, the DB operator runs a read-only query and reports the result:

```sql
-- Read-only. Reports whether the published account exists and is enabled.
SELECT id, email, role, enabled, created_at, updated_at
FROM users
WHERE email = '<email from README>';
```

If a row exists: disable it or set a new random password through the admin UI /
an approved script, then rotate `JWT_SECRET` (A2). Then remove the credentials from
`README.md` (in-repo change, on request).

## History rewrite (optional, decision needed)
Removing `appsettings.json` from `main` stops future exposure but the secret remains
in history and in every clone. Rotation (C3) is what actually neutralises it. If the
team also wants history purged (`git filter-repo`), it needs a coordinated force-push
and every collaborator re-cloning — not to be done without explicit instruction.

## Sign-off
Production may be described as contained only when C1–C3 are marked done **and
verified** by the operator, with the date and how it was verified.
