import { Card } from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import { formatDate, formatTime, fullName } from "../../lib/format";

export default function PatientAppointments({ appointments }) {
    return (
        <Card>
            {appointments.length === 0 ? (
                <EmptyState
                    icon="calendar"
                    title="No appointments yet"
                    description="Appointments are booked at the reception desk. They will appear here once booked."
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
                    ]}
                />
            )}
        </Card>
    );
}
