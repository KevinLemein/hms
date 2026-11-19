import { useState } from "react";
import appointmentService from "../../api/appointmentService";
import { getErrorMessage } from "../../lib/apiError";
import { formatDateTime, fullName } from "../../lib/format";
import { toSlotDateTime } from "../../lib/slots";
import Modal from "../../components/ui/Modal";
import { TextAreaField } from "../../components/ui/Field";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import SlotPicker from "./SlotPicker";

/**
 * Moves a booked or waiting appointment to another free time with the same
 * doctor. Used by the front desk and by patients for their own bookings.
 */
export default function RescheduleDialog({ appointment, onClose, onSaved }) {
    const [when, setWhen] = useState({ date: "", slot: "" });
    const [reason, setReason] = useState(appointment.reason || "");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!when.date || !when.slot) {
            setError("Choose a date and a free time.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const res = await appointmentService.reschedule(appointment.id, toSlotDateTime(when.date, when.slot), reason);
            onSaved(res.data);
        } catch (err) {
            setError(getErrorMessage(err, "The appointment couldn't be rescheduled."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Reschedule appointment"
            description={`Dr. ${fullName(appointment.doctorFirstName, appointment.doctorLastName)} · currently ${formatDateTime(appointment.appointmentDateTime)}`}
            onClose={onClose}
            busy={saving}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={save} loading={saving} loadingText="Saving">Move appointment</Button>
                </>
            }
        >
            <div className="space-y-4">
                {error && <Alert tone="error">{error}</Alert>}
                <SlotPicker
                    doctorId={appointment.doctorId}
                    value={when}
                    onChange={(v) => { setWhen(v); setError(""); }}
                    ignoreAppointmentId={appointment.id}
                />
                <TextAreaField label="Reason for visit" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
        </Modal>
    );
}
