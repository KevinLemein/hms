import { useState } from "react";
import appointmentService from "../../api/appointmentService";
import { getErrorMessage, getFieldErrors } from "../../lib/apiError";
import { toSlotDateTime } from "../../lib/slots";
import { Card } from "../../components/ui/Card";
import { SelectField, TextAreaField } from "../../components/ui/Field";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import SlotPicker from "../appointments/SlotPicker";
import PatientPicker from "./PatientPicker";
import useDoctors from "./useDoctors";

const EMPTY = { doctorId: "", reason: "" };
const NO_SLOT = { date: "", slot: "" };

export default function BookAppointmentForm({ onBooked }) {
    const doctors = useDoctors();
    const [patient, setPatient] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [when, setWhen] = useState(NO_SLOT);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const set = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: undefined });
        // A different doctor has different free times.
        if (e.target.name === "doctorId") setWhen({ ...when, slot: "" });
    };

    const validate = () => {
        const next = {};
        if (!patient) next.patientId = "Select a patient.";
        if (!form.doctorId) next.doctorId = "Select a doctor.";
        if (!when.date) next.appointmentDateTime = "Choose a date.";
        else if (!when.slot) next.appointmentDateTime = "Choose a free time.";
        return next;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const found = validate();
        setErrors(found);
        setFormError("");
        if (Object.keys(found).length) return;

        setSubmitting(true);
        try {
            // The consultation fee is charged by the backend in the same
            // transaction as the booking -- no client-side billing here.
            const res = await appointmentService.book({
                patientId: patient.id,
                doctorId: Number(form.doctorId),
                appointmentDateTime: toSlotDateTime(when.date, when.slot),
                reason: form.reason,
            });
            onBooked(res.data);
            setForm(EMPTY);
            setWhen(NO_SLOT);
            setPatient(null);
        } catch (err) {
            setErrors(getFieldErrors(err));
            // 409 = the time was taken, or is outside the doctor's working hours.
            setFormError(getErrorMessage(err, "The appointment couldn't be booked."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="max-w-2xl">
            <form onSubmit={handleSubmit} noValidate className="space-y-5 px-5 py-5">
                {formError && <Alert tone="error">{formError}</Alert>}
                {doctors.error && <Alert tone="error">Couldn't load the list of doctors. {doctors.error}</Alert>}

                <PatientPicker selected={patient} onSelect={(p) => { setPatient(p); setErrors({ ...errors, patientId: undefined }); }} error={errors.patientId} />

                <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                        label="Doctor"
                        name="doctorId"
                        required
                        value={form.doctorId}
                        onChange={set}
                        error={errors.doctorId}
                        placeholder={doctors.loading ? "Loading doctors…" : "Select a doctor"}
                        options={doctors.options}
                    />
                    <SlotPicker
                        doctorId={form.doctorId}
                        value={when}
                        onChange={(v) => { setWhen(v); setErrors({ ...errors, appointmentDateTime: undefined }); }}
                        error={errors.appointmentDateTime}
                    />
                </div>

                <TextAreaField
                    label="Reason for visit"
                    name="reason"
                    value={form.reason}
                    onChange={set}
                    placeholder="e.g. General check-up, follow-up"
                    hint="A consultation fee is added to the patient's bill automatically when the appointment is booked."
                />

                <Button type="submit" loading={submitting} loadingText="Booking" icon="calendar">Book appointment</Button>
            </form>
        </Card>
    );
}
