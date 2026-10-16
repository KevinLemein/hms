import { useState } from "react";
import patientService from "../../api/patientService";
import appointmentService from "../../api/appointmentService";
import { getErrorMessage, getFieldErrors } from "../../lib/apiError";
import { toApiDateTime } from "../../lib/format";
import { Card } from "../../components/ui/Card";
import { FieldGroup, SelectField, TextAreaField, TextField } from "../../components/ui/Field";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import useDoctors from "./useDoctors";

const EMPTY_PATIENT = {
    firstName: "", lastName: "", email: "", phoneNumber: "",
    dateOfBirth: "", gender: "FEMALE", address: "",
    emergencyContactName: "", emergencyContactPhone: "", allergies: "",
};
const EMPTY_APPOINTMENT = { doctorId: "", appointmentDateTime: "", reason: "" };

/**
 * Registers a patient and books their first appointment.
 *
 * These are two API calls (the backend has no combined endpoint). If the
 * patient is created but the booking fails, the patient still exists: the
 * credentials are shown and the receptionist is told to book separately,
 * rather than being shown a generic "registration failed" message.
 */
export default function RegisterPatientForm({ onRegistered }) {
    const doctors = useDoctors();
    const [patient, setPatient] = useState(EMPTY_PATIENT);
    const [appointment, setAppointment] = useState(EMPTY_APPOINTMENT);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const setP = (e) => { setPatient({ ...patient, [e.target.name]: e.target.value }); setErrors({ ...errors, [e.target.name]: undefined }); };
    const setA = (e) => { setAppointment({ ...appointment, [e.target.name]: e.target.value }); setErrors({ ...errors, [e.target.name]: undefined }); };

    const reset = () => { setPatient(EMPTY_PATIENT); setAppointment(EMPTY_APPOINTMENT); setErrors({}); setFormError(""); };

    const validate = () => {
        const next = {};
        for (const [field, label] of [["firstName", "First name"], ["lastName", "Last name"], ["email", "Email"],
            ["phoneNumber", "Phone"], ["dateOfBirth", "Date of birth"], ["address", "Address"]]) {
            if (!patient[field].trim()) next[field] = `${label} is required.`;
        }
        if (patient.email && !/^\S+@\S+\.\S+$/.test(patient.email)) next.email = "Enter a valid email address.";
        if (!appointment.doctorId) next.doctorId = "Select a doctor.";
        if (!appointment.appointmentDateTime) next.appointmentDateTime = "Choose a date and time.";
        else if (new Date(appointment.appointmentDateTime) < new Date()) next.appointmentDateTime = "Choose a time in the future.";
        return next;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const found = validate();
        setErrors(found);
        setFormError("");
        if (Object.keys(found).length) {
            setFormError("Please correct the highlighted fields.");
            return;
        }

        setSubmitting(true);
        let created;
        try {
            created = (await patientService.registerPatient(patient)).data;
        } catch (err) {
            setErrors(getFieldErrors(err));
            setFormError(getErrorMessage(err, "The patient couldn't be registered."));
            setSubmitting(false);
            return;
        }

        let bookingError = null;
        try {
            await appointmentService.book({
                patientId: created.id,
                doctorId: Number(appointment.doctorId),
                appointmentDateTime: toApiDateTime(appointment.appointmentDateTime),
                reason: appointment.reason,
            });
        } catch (err) {
            bookingError = getErrorMessage(err, "The appointment couldn't be booked.");
        }

        setSubmitting(false);
        reset();
        onRegistered(created, bookingError);
    };

    return (
        <Card className="max-w-3xl">
            <form onSubmit={handleSubmit} noValidate className="space-y-6 px-5 py-5">
                {formError && <Alert tone="error">{formError}</Alert>}

                <FieldGroup title="Personal details">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField label="First name" name="firstName" required autoComplete="off" value={patient.firstName} onChange={setP} error={errors.firstName} />
                        <TextField label="Last name" name="lastName" required autoComplete="off" value={patient.lastName} onChange={setP} error={errors.lastName} />
                        <TextField label="Email" name="email" type="email" required autoComplete="off" value={patient.email} onChange={setP} error={errors.email} hint="Used to sign in to the patient portal." />
                        <TextField label="Phone" name="phoneNumber" type="tel" required autoComplete="off" value={patient.phoneNumber} onChange={setP} error={errors.phoneNumber} placeholder="0712 345 678" />
                        <TextField label="Date of birth" name="dateOfBirth" type="date" required value={patient.dateOfBirth} onChange={setP} error={errors.dateOfBirth} />
                        <SelectField label="Gender" name="gender" required value={patient.gender} onChange={setP} error={errors.gender}
                                     options={[{ value: "FEMALE", label: "Female" }, { value: "MALE", label: "Male" }, { value: "OTHER", label: "Other" }]} />
                    </div>
                    <TextField label="Address" name="address" required autoComplete="off" value={patient.address} onChange={setP} error={errors.address} placeholder="e.g. Westlands, Nairobi" />
                </FieldGroup>

                <FieldGroup title="Emergency contact (optional)">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField label="Contact name" name="emergencyContactName" autoComplete="off" value={patient.emergencyContactName} onChange={setP} />
                        <TextField label="Contact phone" name="emergencyContactPhone" type="tel" autoComplete="off" value={patient.emergencyContactPhone} onChange={setP} />
                    </div>
                </FieldGroup>

                <TextAreaField label="Known allergies" name="allergies" value={patient.allergies} onChange={setP} placeholder="e.g. Penicillin" hint="Leave blank if none are known." />

                <FieldGroup title="First appointment">
                    {doctors.error && <Alert tone="error">Couldn't load the list of doctors. {doctors.error}</Alert>}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <SelectField label="Doctor" name="doctorId" required value={appointment.doctorId} onChange={setA} error={errors.doctorId}
                                     placeholder={doctors.loading ? "Loading doctors…" : "Select a doctor"} options={doctors.options} />
                        <TextField label="Date and time" name="appointmentDateTime" type="datetime-local" required value={appointment.appointmentDateTime} onChange={setA} error={errors.appointmentDateTime} />
                    </div>
                    <TextAreaField label="Reason for visit" name="reason" value={appointment.reason} onChange={setA} placeholder="e.g. General check-up" />
                </FieldGroup>

                <div className="flex flex-wrap gap-2">
                    <Button type="submit" loading={submitting} loadingText="Registering" icon="userPlus">Register and book</Button>
                    <Button variant="secondary" onClick={reset} disabled={submitting}>Clear form</Button>
                </div>
            </form>
        </Card>
    );
}
