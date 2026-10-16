# Phase 1a-2 — Billing & Inventory Integrity: Report

- **Date:** 2026-10-16 · **Branch:** `main` · **All changes uncommitted; nothing pushed or deployed.**
- **No production system was accessed, probed or changed.** The .NET API was not touched.
- **No schema changes.** No entities, tables, columns or constraints were added or altered.
- Follows `docs/phase-1a-report.md` (items 1 and 2 of its "Remaining defects" are resolved here).

## 1. Root causes

| # | Finding | Root cause |
|---|---|---|
| R1 | Browser set the medication price | The backend's only way to add a charge was `POST /bills/{id}/items`, which takes `unitPrice` from the request for every source. The doctor UI made that call itself after prescribing, with `selectedDrug.cost \|\| 0`. |
| R2 | Prescription and its charge not atomic | The two were separate HTTP requests; a failed second call left stock deducted and the patient unbilled. An unpriced drug produced a 0-price request, which was rejected, so it was never billed. |
| R3 | Stock oversold under concurrency | `createPrescription` read `drugs.quantity`, checked it, then wrote `quantity - n` with no lock: concurrent requests passed the same check and overwrote each other's write (lost update). `deletePrescription` had the same pattern. |
| R4 | Retry dispensed twice | Every `POST /api/prescriptions` created a new prescription: a retry or double submit deducted stock and (via R1) charged again. |
| R5 | Clients could create `DRUG_DISPENSE`/`CONSULTATION` charges at any price | `POST /bills/{id}/items` accepted every source. |
| R6 | Deleting a prescription left its charge | Deletion restored stock but never touched the bill. |
| R7 (pre-existing, found while tracing) | Receptionist "Add Charge" always failed | The modal never sent `source`, which the API requires (`@NotNull`). |

Verified before fixing: with 10 units in stock, **8 of 8** overlapping 3-unit
dispensings succeeded; **6** identical concurrent requests created **6** prescriptions.

## 2. When stock is deducted (unchanged business rule)
There is no separate dispensing step, entity or role in this application:
**creating a prescription is the dispensing event.** The doctor's form labels the field
"Quantity Dispensed (deducted from stock)". This rule was preserved; stock is deducted, and
the patient charged, when the prescription is created, and both are reversed when it is
deleted.

## 3. Authoritative price
`drugs.cost` (`numeric(10,2)`, nullable) is the only drug price in the application. It is
used as-is. **No price was invented.** A drug with a missing or non-positive cost **cannot be
dispensed** (409 "… has no price configured"), per decision 1.

The price is copied onto the line item (`unit_price`, `total_price`) at dispensing time, so
later catalogue changes do not alter issued bills.

## 4. How it works now

### `POST /api/prescriptions` — one transaction
Locks are always taken in the same order to avoid deadlocks: **appointment → drug → bill**.

1. Lock the appointment row. Validate: it exists (404), the caller is its assigned doctor
   (403), and its status is not CANCELLED/NO_SHOW (409). Quantity ≥ 1 is validated
   by `@Min(1)` (400).
2. **Duplicate check** (decision 2): one prescription per drug per appointment.
   - Identical request (same quantity, dosage, duration, notes) → returns the existing
     prescription with **200** and its existing charge. Stock and billing are untouched.
   - Same drug, different details → **409** ("edit or delete the existing prescription").
   - The appointment lock makes this check safe under concurrency.
3. Lock the drug row (`SELECT … FOR UPDATE`). Require a price (409), check stock (409 with
   remaining/requested counts), then deduct.
4. Save the prescription.
5. `BillService.chargeDispensedDrug` (requires the caller's transaction):
   - Gets the appointment's bill under a row lock, or creates one.
   - A CANCELLED bill → 409, which rolls back everything.
   - A PAID bill is reopened (status recalculates to PARTIALLY_PAID; decision 3).
   - Adds a `DRUG_DISPENSE` line item priced `drugs.cost × quantity`, referencing the
     prescription ID.
6. Respond **201** with `billId` and `chargeAmount` (additive fields).

Any exception in steps 1–5 rolls back the stock deduction, prescription and charge together.

### `DELETE /api/prescriptions/{id}` — one transaction, same lock order
Lock appointment → lock drug → remove the prescription's `DRUG_DISPENSE` line item
(bill row locked; **409 if the bill has any payment recorded**, because there is no refund
flow) → restore stock → delete the prescription.

### `POST /api/bills/{id}/items`
Rejects `DRUG_DISPENSE` and `CONSULTATION` with **400**. Only the server creates those,
priced from server data. `MANUAL` and `LAB` remain staff-priced, as before. Booking now
uses the internal `addSystemLineItem` for the consultation fee.

### Concurrency mechanism
A pessimistic row lock (`PESSIMISTIC_WRITE`) on `drugs` for every stock change in the
Spring service (create and delete). I chose it over a conditional
`UPDATE … WHERE quantity >= n` because the price and stock must be read consistently in
the same locked step, and it matches the bill/appointment locking introduced in Phase 1a.

### Frontend
- `DoctorDashboard.jsx`: the client-side bill lookup, creation and charge block is
  removed; the form only creates the prescription.
- `ReceptionistDashboard.jsx`: "Add Charge" sends `source: "MANUAL"` (fixes R7).

## 5. Tests

New class `MedicationDispensingIntegrationTest` with 18 tests: Testcontainers PostgreSQL 16,
fictional data. Run against the **unfixed** code first: **14 of 18 failed**.

| Requirement | Test(s) |
|---|---|
| 1 Client price can't change the charge | `chargeUsesServerPriceAndIgnoresAnyClientSuppliedPrice`, `clientsCannotPostServerOwnedChargeSources` |
| 2 Invalid quantities | `invalidQuantitiesAreRejected` |
| 3 Ineligible / inaccessible | `anotherDoctorsAppointmentCannotBeCharged`, `cancelledOrNoShowAppointmentsCannotBeCharged`, `unpricedDrugsCannotBeDispensed`, `unknownDrugOrAppointmentIs404` |
| 4 / 10 No duplicate charge or deduction | `identicalRetryReturnsTheExistingPrescription…`, `sameDrugWithDifferentDetails…IsAConflict`, `concurrentIdenticalRequestsDispenseOnce` |
| 5 Legitimate billing | `chargeLandsOnTheAppointmentsExistingBill`, `billIsCreatedWhenTheAppointmentHasNone`, `drugChargeReopensAPaidBill` |
| 6 / 11 Rollback | `cancelledBillRollsBackStockAndPrescription`, `insufficientStockIsRejectedWithoutSideEffects` |
| 7 Insufficient stock | `insufficientStockIsRejectedWithoutSideEffects` |
| 8 / 9 No oversell, never negative | `concurrentDispensingCannotOversellOrGoNegative` (8 threads released together, 10 units, 3 each → exactly 3 succeed, 1 left, dispensed + stock = 10) |
| 12 Existing rules (deletion) | `deletingAPrescriptionRestoresStockAndRemovesItsCharge`, `deletingIsBlockedOnceTheBillHasPayments` |
| 13 Phase 1a regression | all 54 Phase 1a tests |

**Mutation checks** (each lock removed temporarily, then the file restored and verified by
checksum):
- Drug lock removed → `concurrentDispensingCannotOversellOrGoNegative` fails (8 succeed, expected 3).
- Appointment lock removed → `concurrentIdenticalRequestsDispenseOnce` fails (6 prescriptions, expected 1).

## 6. Results

| Check | Result |
|---|---|
| `./mvnw clean test` | **72 / 72 pass** (54 Phase 1a + 18 new) |
| `./mvnw test` (second run) | **72 / 72 pass** |
| `./mvnw -DskipTests package` | Success (`backend-0.0.1-SNAPSHOT.jar`) |
| `vite build` | Success |
| `eslint .` | 8 errors, 11 warnings: identical to the end of Phase 1a, all in files not touched here; the two changed pages have 0 errors |
| Diff review | No secrets; no unrelated changes; your earlier `Home.jsx`/`Login.jsx` edits unchanged |

A first full run reported 2 errors (`NoSuchMethodError`): a stale compiled test class built
against the old method signature. A clean build resolved it; it was not a logic failure.

## 7. Behaviour changes for clients
| Change | Before | After |
|---|---|---|
| Insufficient stock | 400 | **409** |
| Identical re-submit of a prescription | New prescription, double deduction | **200** with the existing one |
| Same drug again on an appointment (different details) | Allowed | **409** |
| Unpriced drug | Prescribed, never billed | **409**, nothing dispensed |
| Prescribing after the consultation is paid | (Charge failed in browser) | Charge added; bill → PARTIALLY_PAID |
| Prescribing on CANCELLED / NO_SHOW appointment | Allowed | **409** |
| Client posting DRUG_DISPENSE/CONSULTATION charges | Allowed at any price | **400** |
| Deleting a prescription | Stock restored, charge left on bill | Stock restored **and** charge removed; 409 if the bill has payments |

## 8. Remaining limitations / follow-ups
1. **Application-level guarantees only.** The duplicate rule and non-negative stock are
   enforced by locks in the Spring service; a database constraint is a stronger guarantee
   (it also covers writers outside this service). Recommended once Flyway is approved
   (D3), after reconciling existing data:
   - `UNIQUE (appointment_id, drug_id)` on `prescriptions` (check for existing duplicates first);
   - `CHECK (quantity >= 0)` on `drugs`;
   - `UNIQUE (appointment_id)` on `bills`.
2. **The .NET API can still change stock and prescriptions** directly and anonymously,
   bypassing these locks and rules. Only containment or retirement fixes that
   (`docs/security-incident-checklist.md`).
3. **Operational prerequisite before deploying:** any drug without a price becomes
   un-dispensable. The DB operator should run this read-only query and price those drugs
   first:
   `SELECT id, name FROM drugs WHERE cost IS NULL OR cost <= 0;`
4. No refund / credit-note flow: a charged prescription can't be deleted once its bill has
   payments (409).
5. There is still no Spring endpoint to maintain the drug catalogue (prices, stock intake).
6. Doctors can still list all prescriptions (`GET /api/prescriptions`). Unchanged; noted in Phase 1a.
7. **UI changes were verified by build and lint only, not in a browser.**
