# .NET API — Migration and Retirement Plan (Decision D4)

- **Status:** Plan only. The .NET API has **not** been changed, probed, stopped or retired.
- **Goal:** one supported client-facing API (Spring Boot), after which the .NET deployment is
  decommissioned.
- **Urgent and separate:** containment of the unauthenticated, publicly reachable .NET API
  (`security-incident-checklist.md`, INC-2) must not wait for this plan. Ask its owner to
  restrict access or stop it now.

## 1. Consumers

| Consumer | Evidence | Status |
|---|---|---|
| MediCare web app | Called `/api/Prescriptions`, `/api/Drugs` until commit `005bd1d`; now calls Spring's lower-case `/api/prescriptions`, `/api/drugs` | **No longer a consumer** |
| nginx | `frontend/nginx.conf` proxies `/api/Prescriptions*` and `/api/Drugs*` to the external .NET host | Dead routes; remove in step 4 |
| Anyone who found the public Swagger UI | API is anonymous and Swagger is the landing page | **Unknown**: only the host's access logs can tell |
| Staff maintaining the drug catalogue | Spring has **no** drug create/update endpoints; the .NET `PUT/POST /api/Drugs` (or direct SQL) are the only ways to set prices and stock | **Likely real dependency** |
| Medical records | .NET exposes `/api/MedicalRecords`; Spring has no equivalent | Unknown whether it's used |

## 2. Data responsibilities (shared database)

| Table | .NET writes? | Spring equivalent? | Note |
|---|---|---|---|
| `drugs` | Yes (CRUD) | Read + stock changes only | Needs Spring catalogue management first |
| `prescriptions` | Yes (CRUD, no stock or billing rules) | Yes (full rules) | .NET writes bypass stock, billing and authorization |
| `appointments`, `users`, `doctors` | Yes | Yes | .NET writes bypass every Spring rule |
| `payments` | Yes (different column shape) | Yes | Schema conflict, see `database-migration-strategy.md` |
| `medical_records`, `patient`, `gender`, `appointment_status`, `specialities`, Identity tables | Yes | No | .NET-only; product decision whether to keep the data |

## 3. Steps

1. **Contain (now).** As INC-2: the owner restricts the API to known IPs or stops it. Rotate the database credential it uses (INC-1). Nothing below depends on it remaining public.
2. **Inventory (owner + operator).** Review 30 days of .NET host access logs: which endpoints, from which client IPs or user-agents. Confirm whether anyone maintains drugs or medical records through it.
3. **Replace what is actually used (Spring, separately approved), for example:**
   - drug catalogue management for admin: create a drug, update price, record stock intake (with the same row lock as dispensing), deactivate;
   - medical records, only if the product needs them; otherwise archive the table data.
4. **Cut over.**
   - Remove the two nginx `.NET` routes (one small, reviewed change).
   - Give the .NET deployment a read-only database user for one release cycle, as a safety net.
   - Watch for errors.
5. **Decommission.**
   - Stop the deployment and remove its DNS and certificates.
   - Revoke its database user.
   - Tag the last commit containing `dotnetapi/`, then remove the folder from `main`, or keep it archived (repository owner's choice).
   - Remove the committed credential from the repository going forward. It is already rotated in step 1; history rewrite is optional and needs coordination.
6. **Schema clean-up (later, via approved migrations only).** Drop or archive .NET-only tables after the data decision. Never as part of decommissioning itself.

**Rollback:** until step 5, restoring the nginx routes and the read-write user returns to the
previous state. No data migrations are involved in steps 1–5.

## 4. Decisions needed
- From the .NET API owner: agreement and a date for containment (step 1).
- Whether drug maintenance and medical records must move to Spring (step 3).
- Whether to archive or keep the .NET-only tables (step 6).
