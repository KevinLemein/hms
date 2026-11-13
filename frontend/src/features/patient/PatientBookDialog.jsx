import { useState } from "react";
import appointmentService from "../../api/appointmentService";
import { getErrorMessage } from "../../lib/apiError";
import { toSlotDateTime } from "../../lib/slots";
import Modal from "../../components/ui/Modal";
import { SelectField, TextAreaField } from "../../components/ui/Field";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import useDoctors from "../receptionist/useDoctors";
import SlotPicker from "../appointments/SlotPicker";

/** A patient books their own appointment; the backend takes the patient from the sign-in. */
export default function PatientBookDialog({ onClose, onBooked }) {
    const doctors = useDoctors();
    const [doctorId, setDoctorId] = useState("");
    const [when, setWhen] = useState({ date: "", slot: "" });
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!doctorId || !when.date || !when.slot) {
            setError("Choose a doctor, a date and a free time.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const res = await appointmentService.book({
                doctorId: Number(doctorId),
                appointmentDateTime: toSlotDateTime(when.date, when.slot),
                reason,
            });
            onBooked(res.data);
        } catch (err) {
            setError(getErrorMessage(err, "The appointment couldn't be booked."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Book an appointment"
            description="A consultation fee is added to your bill when you book."
            onClose={onClose}
            busy={saving}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={save} loading={saving} loadingText="Booking" icon="calendar">Book appointment</Button>
                </>
            }
        >
            <div className="space-y-4">
                {error && <Alert tone="error">{error}</Alert>}
                {doctors.error && <Alert tone="error">Couldn't load the list of doctors. {doctors.error}</Alert>}
                <SelectField
                    label="Doctor"
                    required
                    value={doctorId}
                    onChange={(e) => { setDoctorId(e.target.value); setWhen({ ...when, slot: "" }); setError(""); }}
                    placeholder={doctors.loading ? "Loading doctors" : "Select a doctor"}
                    options={doctors.options}
                />
                <SlotPicker doctorId={doctorId} value={when} onChange={(v) => { setWhen(v); setError(""); }} />
                <TextAreaField
                    label="Reason for visit"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. General check-up, follow-up"
                />
            </div>
        </Modal>
    );
}
