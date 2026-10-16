import { useState } from "react";
import appointmentService from "../../api/appointmentService";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../lib/apiError";
import { fullName } from "../../lib/format";
import { statusLabel } from "../../lib/statuses";
import { ConfirmDialog } from "../../components/ui/Modal";

/**
 * Actions each role is offered per appointment status. The backend enforces
 * the real rules (allowed transitions, doctors only on their own
 * appointments); these lists only decide which buttons to show.
 */
export const FRONT_DESK_ACTIONS = {
    PENDING: [
        { label: "Check in", next: "WAITING", variant: "primary" },
        { label: "Cancel", next: "CANCELLED", variant: "dangerOutline", confirm: true },
    ],
    WAITING: [
        { label: "Start consultation", next: "IN_CONSULTATION", variant: "secondary" },
        { label: "No-show", next: "NO_SHOW", variant: "dangerOutline", confirm: true },
    ],
    IN_CONSULTATION: [{ label: "Complete", next: "COMPLETED", variant: "secondary" }],
};

export const DOCTOR_ACTIONS = {
    WAITING: [{ label: "Start consultation", next: "IN_CONSULTATION", variant: "primary" }],
    IN_CONSULTATION: [{ label: "Complete visit", next: "COMPLETED", variant: "secondary" }],
};

const CONFIRM_TEXT = {
    CANCELLED: "The appointment will be cancelled. This can't be undone; a new appointment would have to be booked.",
    NO_SHOW: "The appointment will be marked as a no-show. This can't be undone.",
};

/**
 * Runs a status change with: a confirmation step for irreversible outcomes,
 * a per-row pending state (so the same action can't be sent twice), and a
 * toast with the server's message on failure (e.g. 409 invalid transition).
 */
export default function useStatusChange(onUpdated) {
    const { showError, showSuccess } = useToast();
    const [pendingId, setPendingId] = useState(null);
    const [confirming, setConfirming] = useState(null);

    const run = async (appointment, action) => {
        setPendingId(appointment.id);
        try {
            const res = await appointmentService.updateStatus(appointment.id, action.next);
            onUpdated(res.data);
            showSuccess(`${fullName(appointment.patientFirstName, appointment.patientLastName)}: ${statusLabel("appointment", action.next)}`);
        } catch (err) {
            showError(getErrorMessage(err, "The status couldn't be updated."));
        } finally {
            setPendingId(null);
            setConfirming(null);
        }
    };

    const request = (appointment, action) => {
        if (action.confirm) setConfirming({ appointment, action });
        else run(appointment, action);
    };

    const dialog = confirming && (
        <ConfirmDialog
            title={`${confirming.action.label} — ${fullName(confirming.appointment.patientFirstName, confirming.appointment.patientLastName)}?`}
            message={CONFIRM_TEXT[confirming.action.next]}
            confirmLabel={confirming.action.label}
            tone="danger"
            loading={pendingId === confirming.appointment.id}
            onConfirm={() => run(confirming.appointment, confirming.action)}
            onCancel={() => setConfirming(null)}
        />
    );

    return { request, pendingId, dialog };
}
