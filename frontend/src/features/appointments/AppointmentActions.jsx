import Button from "../../components/ui/Button";
import { fullName } from "../../lib/format";

/** Status buttons for one appointment row. Disabled while any change to it is in flight. */
export default function AppointmentActions({ appointment, actions, pendingId, onAction, children }) {
    const list = actions[appointment.appointmentStatus] || [];
    if (list.length === 0 && !children) return <span className="text-slate-500">—</span>;
    const busy = pendingId === appointment.id;
    const who = fullName(appointment.patientFirstName, appointment.patientLastName);
    return (
        <div className="flex flex-wrap gap-1.5">
            {children}
            {list.map((action) => (
                <Button
                    key={action.next}
                    size="sm"
                    variant={action.variant}
                    disabled={busy}
                    onClick={() => onAction(appointment, action)}
                    aria-label={`${action.label}: ${who}`}
                >
                    {action.label}
                </Button>
            ))}
        </div>
    );
}
