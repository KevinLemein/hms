import { Card, CardHeader } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import { LoadError } from "../../components/ui/Alert";
import { SkeletonRows } from "../../components/ui/Spinner";
import { formatTime, fullName } from "../../lib/format";
import AppointmentActions from "../appointments/AppointmentActions";
import { DOCTOR_ACTIONS } from "../appointments/useStatusChange";

const IN_QUEUE = ["WAITING", "IN_CONSULTATION"];

/** Today's checked-in patients, in appointment order, with the doctor's next actions. */
export default function QueuePanel({ today, statusChange, onPrescribe }) {
    const queue = (today.data || [])
        .filter((a) => IN_QUEUE.includes(a.appointmentStatus))
        .sort((a, b) => new Date(a.appointmentDateTime) - new Date(b.appointmentDateTime));
    const notArrived = (today.data || []).filter((a) => a.appointmentStatus === "PENDING").length;

    return (
        <Card aria-busy={today.loading}>
            <CardHeader
                title="Patient queue"
                description={today.loading ? "Loading…" : `${queue.length} checked in · ${notArrived} booked but not yet arrived`}
                actions={<Button size="sm" variant="ghost" icon="refresh" onClick={today.reload} disabled={today.loading}>Refresh</Button>}
            />
            {today.loading ? (
                <SkeletonRows label="Loading queue" />
            ) : today.error ? (
                <LoadError message={today.error} onRetry={today.reload} />
            ) : queue.length === 0 ? (
                <EmptyState icon="users" title="No patients waiting" description="Patients appear here once reception checks them in." />
            ) : (
                <ol className="divide-y divide-slate-100">
                    {queue.map((a) => (
                        <li key={a.id} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${a.appointmentStatus === "IN_CONSULTATION" ? "bg-sky-50/60" : ""}`}>
                            <div className="min-w-0">
                                <p className="font-medium text-slate-900">{fullName(a.patientFirstName, a.patientLastName)}</p>
                                <p className="text-sm text-slate-600">
                                    {formatTime(a.appointmentDateTime)} · {a.patientPhone}
                                    {a.reason && <> · {a.reason}</>}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge kind="appointment" value={a.appointmentStatus} />
                                <AppointmentActions appointment={a} actions={DOCTOR_ACTIONS} pendingId={statusChange.pendingId} onAction={statusChange.request}>
                                    {a.appointmentStatus === "IN_CONSULTATION" && (
                                        <Button size="sm" variant="secondary" icon="pill" onClick={() => onPrescribe(a)}>Prescribe</Button>
                                    )}
                                </AppointmentActions>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}
