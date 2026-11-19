--
-- MediCare: bills legacy columns
--
-- The dump (medicare.sql) predates the current Bill entity. Its bills table
-- still has payment_status and total_amount as NOT NULL, but the entity no
-- longer writes them (the total is derived from line items, the status lives
-- in `status`). Every INSERT INTO bills therefore failed, which broke booking
-- an appointment (the booking creates a bill).
--
-- Run once; safe to re-run:
--
--     psql -U postgres -d medicare -f database/bills_legacy_columns_migration.sql
--
ALTER TABLE public.bills ALTER COLUMN payment_status DROP NOT NULL;
ALTER TABLE public.bills ALTER COLUMN total_amount DROP NOT NULL;
