# Database Migration Strategy (Decision D3)

- **Status:** Strategy only. **Flyway is not in the running application** and no migration has
  been written or applied. Approved condition (D3): introduce Flyway only after the existing
  schema, Hibernate behaviour and the .NET migration history have been reconciled against an
  authorised, schema-only production dump, validated in an isolated environment.
- **Date:** 2026-10-16

## 1. Current state (from the code; production unverified)

| Fact | Source |
|---|---|
| Spring Boot manages schema with `spring.jpa.hibernate.ddl-auto=update` (docker profile, which production uses) | `application-docker.properties` |
| `update` only **adds** tables/columns. It never drops, renames or changes types, and it can't add `NOT NULL`/unique constraints to tables that already hold conflicting rows (it logs and continues) | Hibernate behaviour |
| The .NET API (EF Core) also has migrations against the **same database**: `appointments`, `doctors`, `drugs`, `prescriptions`, `payments`, `users`, `patient`, `medical_records`, `specialities`, `gender`, `appointment_status`, ASP.NET Identity tables | `dotnetapi/Migrations`, `dotnetapi/MigrationScript.sql` |
| At least one **shape conflict**: EF's `payments` (`appointment_id`, `total_amount`, `transaction_code`, `date_paid`) vs Spring's `payments` (`bill_id`, `amount`, `method`, `reference`, `recorded_by_user_id`, `paid_at`) | entity vs EF model |
| `MigrationScript.sql` contains destructive statements (`DROP COLUMN`, type changes `USING created_by_id::bigint`) | file |
| What Spring **expects** today | [`database/hibernate-expected-schema.sql`](database/hibernate-expected-schema.sql) (generated, 9 tables) |

**Unknown until the dump is inspected:**
- the real production schema;
- whether `__EFMigrationsHistory` exists, and which EF migrations ran;
- whether `uq_line_item_source` and the `users` unique constraints exist;
- which tables or columns are .NET-only or orphaned;
- whether existing data would violate the planned constraints.

## 2. Why not just switch on Flyway now
- A baseline written from the entities (or from a local database) would not match production, and the first `migrate` against production could fail or, worse, partially apply.
- Turning off `ddl-auto=update` before a verified baseline exists means any entity change silently fails at runtime on production.
- Constraints such as "one prescription per drug per appointment" can't be added while violating rows exist; those rows must be found and resolved first, which is a data decision for the clinic.

## 3. Procedure

### Step 1: obtain the schema (DB operator; after the credential rotation in INC-1)
```bash
# Run by the operator with a read-only account. Schema only: no rows, no patient data.
pg_dump --schema-only --no-owner --no-privileges --dbname="$PROD_URL" > medicare-schema-YYYYMMDD.sql
```
- **Never commit** the dump or any credentials. Store it outside the repository, with access limited to the people doing this work.
- Also export, read-only, `SELECT * FROM "__EFMigrationsHistory";` if that table exists (no patient data).

### Step 2: restore in isolation
```bash
docker run -d --rm --name schema-check -e POSTGRES_PASSWORD=local -p 55440:5432 postgres:16-alpine
psql postgresql://postgres:local@localhost:55440/postgres -c 'CREATE DATABASE medicare'
psql postgresql://postgres:local@localhost:55440/medicare -f medicare-schema-YYYYMMDD.sql
```

### Step 3: compare
1. Text/structural diff against `docs/database/hibernate-expected-schema.sql` (e.g. with `migra` or by hand, table by table).
2. Start the backend against the restored copy with `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`. Every mismatch Hibernate reports is a reconciliation item. This runs only against the isolated copy.
3. Produce a reconciliation table: for each table, its owner (Spring / .NET / shared / orphan), the differences found, and the resolution.

### Step 4: data checks (read-only queries, run by the operator on production; counts only)
```sql
-- Would block UNIQUE (appointment_id, drug_id) on prescriptions
SELECT COUNT(*) FROM (SELECT appointment_id, drug_id FROM prescriptions GROUP BY 1,2 HAVING COUNT(*) > 1) x;
-- Would block CHECK (quantity >= 0) on drugs
SELECT COUNT(*) FROM drugs WHERE quantity < 0;
-- Would block UNIQUE (appointment_id) on bills
SELECT COUNT(*) FROM (SELECT appointment_id FROM bills WHERE appointment_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1) x;
-- Would block UNIQUE (method, reference) on payments
SELECT COUNT(*) FROM (SELECT method, lower(reference) FROM payments WHERE reference IS NOT NULL GROUP BY 1,2 HAVING COUNT(*) > 1) x;
-- Would block the active-slot rule on appointments
SELECT COUNT(*) FROM (SELECT doctor_id, appointment_date_time FROM appointments
                      WHERE status NOT IN ('CANCELLED','NO_SHOW') GROUP BY 1,2 HAVING COUNT(*) > 1) x;
-- Operational: drugs that can no longer be dispensed (Phase 1a-2)
SELECT COUNT(*) FROM drugs WHERE cost IS NULL OR cost <= 0;
```

### Step 5: baseline
- `V1__baseline.sql` = the **production** schema as dumped (cleaned only of owner and grant noise), not the entity-generated one.
- Existing databases: `spring.flyway.baseline-on-migrate=true`, `baseline-version=1`, so V1 is recorded but not executed.
- New or empty environments run V1 from scratch.
- .NET-only tables stay in V1 untouched; removing them is a later, separately approved migration (see `dotnet-retirement-plan.md`).

### Step 6: reconciliation and constraint migrations (each one separately approved)
| Migration | Change | Prerequisite |
|---|---|---|
| V2 | Resolve the `payments` shape conflict | Decision on .NET payment data (keep / migrate / archive) |
| V3 | `UNIQUE (appointment_id, drug_id)` on `prescriptions` | Step 4 count = 0 or rows resolved |
| V4 | `CHECK (quantity >= 0)` on `drugs` | count = 0 |
| V5 | `UNIQUE (appointment_id)` on `bills` (partial: not null) | count = 0 |
| V6 | Partial `UNIQUE (method, lower(reference)) WHERE reference IS NOT NULL` on `payments` | count = 0 |
| V7 | Partial `UNIQUE (doctor_id, appointment_date_time) WHERE status NOT IN ('CANCELLED','NO_SHOW')` on `appointments` | count = 0 |
| V8 | Indexes: `appointments(doctor_id, appointment_date_time)`, `appointments(patient_id)`, `bills(patient_id)`, `bills(status)`, `prescriptions(appointment_id)`, `prescriptions(doctor_id)` | none |

All migrations are additive and non-destructive. Each is rehearsed on the isolated copy, then on a staging copy of production **data** (restored by the operator), before any production run. Take a backup immediately before production.

### Step 7: switch Hibernate to `validate`
Only after V1 is verified on staging and the app starts cleanly with `validate` against it. From then on, every entity change needs a migration, and startup fails on a mismatch, which is the intended safety net.

## 4. What is needed to proceed
1. The schema-only dump and the EF history export (Step 1), obtained through an authorised process.
2. The Step 4 counts from the operator.
3. A decision from the .NET API owner on which tables the .NET API still writes.
