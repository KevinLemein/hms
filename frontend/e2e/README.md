# Browser (end-to-end) tests

Playwright tests that drive the real web app against a **local** backend and a
**throwaway** PostgreSQL database seeded with fictional data. Never point them
at a shared or production database: the setup creates accounts, bookings,
prescriptions and payments.

## One-time setup

```bash
cd frontend
npm install
npx playwright install chromium
```

## Each run

From the repository root, in three terminals or as background jobs:

```bash
# 1. Fresh throwaway database (removed automatically when stopped)
docker run -d --rm --name hms-e2e-pg -e POSTGRES_USER=e2e -e POSTGRES_PASSWORD=e2e \
  -e POSTGRES_DB=hms_e2e -p 55433:5432 postgres:16-alpine

# 2. Backend on port 18080 against it (any throwaway JWT key). The production
#    profile allows no cross-origin browser calls by default, so the Vite origin
#    used by the tests is allowed explicitly.
cd backend
CORS_ALLOWED_ORIGINS=http://localhost:5173 \
DB_URL=jdbc:postgresql://localhost:55433/hms_e2e DB_USERNAME=e2e DB_PASSWORD=e2e \
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n') JWT_EXPIRATION=3600000 \
ADMIN_EMAIL=admin@example.test ADMIN_PASSWORD='E2E-Admin#2026' \
./mvnw spring-boot:run -Dspring-boot.run.profiles=docker -Dspring-boot.run.arguments=--server.port=18080

# 3. Tests (Playwright starts the Vite dev server itself, pointed at :18080)
cd frontend
npm run test:e2e

# Afterwards
docker stop hms-e2e-pg
```

The specs run in order (01 → 05) and build on each other's data, so the
database must be empty at the start of every run; the setup refuses to run
otherwise. Overrides: `E2E_API_BASE_URL`, `E2E_PG_CONTAINER`, `E2E_PG_USER`,
`E2E_PG_DB`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`.
