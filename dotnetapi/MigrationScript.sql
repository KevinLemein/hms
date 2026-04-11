START TRANSACTION;
ALTER TABLE appointments DROP CONSTRAINT fk_appointments_appointment_status_status_id;

ALTER TABLE appointments DROP CONSTRAINT fk_appointments_doctors_doctor_id;

ALTER TABLE prescriptions DROP CONSTRAINT fk_prescriptions_doctors_doctor_id;

DROP INDEX ix_prescriptions_doctor_id;

DROP INDEX ix_appointments_status_id;

ALTER TABLE appointments DROP COLUMN status_id;

ALTER TABLE appointments RENAME COLUMN appointment_date TO created_at;

ALTER TABLE prescriptions ALTER COLUMN appointment_id TYPE bigint USING created_by_id::bigint;

ALTER TABLE prescriptions ALTER COLUMN id TYPE bigint USING created_by_id::bigint;

ALTER TABLE prescriptions ADD doctor_id1 bigint NOT NULL DEFAULT 0;

ALTER TABLE payments ALTER COLUMN appointment_id TYPE bigint USING created_by_id::bigint;

ALTER TABLE patient ALTER COLUMN id TYPE bigint USING created_by_id::bigint;

ALTER TABLE medical_records ALTER COLUMN appointment_id TYPE bigint USING created_by_id::bigint;

ALTER TABLE medical_records ALTER COLUMN id TYPE bigint USING created_by_id::bigint;

ALTER TABLE doctors ALTER COLUMN id TYPE bigint USING created_by_id::bigint;

ALTER TABLE appointments ALTER COLUMN patient_id TYPE bigint USING created_by_id::bigint;

ALTER TABLE appointments ALTER COLUMN doctor_id TYPE bigint USING created_by_id::bigint;
UPDATE appointments SET doctor_id = 0 WHERE doctor_id IS NULL;
ALTER TABLE appointments ALTER COLUMN doctor_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN doctor_id SET DEFAULT 0;

ALTER TABLE appointments ALTER COLUMN id TYPE bigint USING created_by_id::bigint;

ALTER TABLE appointments ADD appointment_date_time timestamp with time zone NOT NULL DEFAULT TIMESTAMPTZ '-infinity';

ALTER TABLE appointments ADD notes text;

ALTER TABLE appointments ADD reason text;

ALTER TABLE appointments ADD status text NOT NULL DEFAULT '';

ALTER TABLE appointments ADD updated_at timestamp with time zone;

CREATE INDEX ix_prescriptions_doctor_id1 ON prescriptions (doctor_id1);

ALTER TABLE appointments ADD CONSTRAINT fk_appointments_doctors_doctor_id FOREIGN KEY (doctor_id) REFERENCES doctors (id) ON DELETE CASCADE;

ALTER TABLE prescriptions ADD CONSTRAINT fk_prescriptions_doctors_doctor_id1 FOREIGN KEY (doctor_id1) REFERENCES doctors (id) ON DELETE CASCADE;

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20260407144904_UsersUpdate2', '10.0.5');

COMMIT;

START TRANSACTION;
ALTER TABLE appointments ADD status_id integer;

INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
VALUES ('20260407144942_UsersUpdate3', '10.0.5');

COMMIT;

