import { useState } from "react";
import appointmentService from "../../api/appointmentService";
import { getErrorMessage, getFieldErrors } from "../../lib/apiError";
import { toApiDateTime } from "../../lib/format";
import { Card } from "../../components/ui/Card";
import { SelectField, TextAreaField, TextField } from "../../components/ui/Field";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import PatientPicker from "./PatientPicker";
import useDoctors from "./useDoctors";

const EMPTY = { doctorId: "", appointmentDateTime: "", reason: "" };

export default function BookAppointmentForm({ onBooked }) {
    const doctors = useDoctors();
    const [patient, setPatient] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const set = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: undefined });
    };

    const validate = () => {
        const next = {};
        if (!patient) next.patientId = "Select a patient.";
        if (!form.doctorId) next.doctorId = "Select a doctor.";
        if (!form.appointmentDateTime) next.appointmentDateTime = "Choose a date and time.";
        else if (new Date(form.appointmentDateTime) < new Date()) next.appointmentDateTime = "Choose a time in the future.";
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
                appointmentDateTime: toApiDateTime(form.appointmentDateTime),
                reason: form.reason,
            });
            onBooked(res.data);
            setForm(EMPTY);
            setPatient(null);
        } catch (err) {
            setErrors(getFieldErrors(err));
            // 409 = the doctor already has an appointment at that time.
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
                    <TextField
                        label="Date and time"
                        name="appointmentDateTime"
                        type="datetime-local"
                        required
                        value={form.appointmentDateTime}
                        onChange={set}
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
