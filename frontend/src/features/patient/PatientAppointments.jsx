import { useState } from "react";
import { useToast } from "../../context/ToastContext";
import { Card, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import { formatDate, formatTime, fullName } from "../../lib/format";
import AppointmentActions from "../appointments/AppointmentActions";
import RescheduleDialog from "../appointments/RescheduleDialog";
import useStatusChange, { PATIENT_ACTIONS } from "../appointments/useStatusChange";
import PatientBookDialog from "./PatientBookDialog";

const canReschedule = (a) => a.appointmentStatus === "PENDING" || a.appointmentStatus === "WAITING";

/** The patient's appointments, with booking, rescheduling and cancelling. `onChanged` reloads them. */
export default function PatientAppointments({ appointments, onChanged }) {
    const { showSuccess } = useToast();
    const [booking, setBooking] = useState(false);
    const [rescheduling, setRescheduling] = useState(null);
    const { request, pendingId, dialog } = useStatusChange(() => onChanged());

    return (
        <Card>
            <CardHeader
                title="Your appointments"
                actions={<Button size="sm" icon="plus" onClick={() => setBooking(true)}>Book appointment</Button>}
            />
            {appointments.length === 0 ? (
                <EmptyState
                    icon="calendar"
                    title="No appointments yet"
                    description="Book an appointment with a doctor and it will appear here."
                />
            ) : (
                <DataTable
                    caption="Your appointments"
                    rows={appointments}
                    columns={[
                        {
                            key: "date",
                            header: "Date",
                            render: (a) => (
                                <span className="font-medium text-slate-900">
                                    {formatDate(a.appointmentDateTime)} <span className="font-normal text-slate-600">{formatTime(a.appointmentDateTime)}</span>
                                </span>
                            ),
                        },
                        { key: "doctor", header: "Doctor", render: (a) => `Dr. ${fullName(a.doctorFirstName, a.doctorLastName)}` },
                        { key: "reason", header: "Reason", render: (a) => a.reason || "—" },
                        { key: "status", header: "Status", render: (a) => <StatusBadge kind="appointment" value={a.appointmentStatus} /> },
                        {
                            key: "actions",
                            header: "Actions",
                            render: (a) => (
                                <AppointmentActions appointment={a} actions={PATIENT_ACTIONS} pendingId={pendingId} onAction={request}>
                                    {canReschedule(a) && (
                                        <Button size="sm" variant="secondary" onClick={() => setRescheduling(a)} aria-label={`Reschedule appointment on ${formatDate(a.appointmentDateTime)}`}>
                                            Reschedule
                                        </Button>
                                    )}
                                </AppointmentActions>
                            ),
                        },
                    ]}
                />
            )}

            {dialog}
            {booking && (
                <PatientBookDialog
                    onClose={() => setBooking(false)}
                    onBooked={() => { setBooking(false); showSuccess("Appointment booked"); onChanged(); }}
                />
            )}
            {rescheduling && (
                <RescheduleDialog
                    appointment={rescheduling}
                    onClose={() => setRescheduling(null)}
                    onSaved={() => { setRescheduling(null); showSuccess("Appointment rescheduled"); onChanged(); }}
                />
            )}
        </Card>
    );
}
