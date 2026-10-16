import { useState } from "react";
import { Card, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import Button from "../../components/ui/Button";
import { LoadError } from "../../components/ui/Alert";
import { SkeletonRows } from "../../components/ui/Spinner";
import { FilterGroup } from "../../components/ui/Tabs";
import { formatDate, formatTime, fullName } from "../../lib/format";

const FILTERS = [
    { value: "ALL", label: "All" },
    { value: "PENDING", label: "Booked" },
    { value: "WAITING", label: "Waiting" },
    { value: "IN_CONSULTATION", label: "In consultation" },
    { value: "COMPLETED", label: "Completed" },
];

// The backend refuses prescriptions on cancelled / no-show visits.
const PRESCRIBABLE = ["PENDING", "WAITING", "IN_CONSULTATION", "COMPLETED"];

export default function DoctorAppointmentsPanel({ history, onPrescribe }) {
    const [filter, setFilter] = useState("ALL");
    const { appointments = [], prescriptions = [] } = history.data || {};
    const rows = filter === "ALL" ? appointments : appointments.filter((a) => a.appointmentStatus === filter);
    const countFor = (id) => prescriptions.filter((p) => p.appointmentId === id).length;

    return (
        <Card aria-busy={history.loading}>
            <CardHeader
                title="My appointments"
                description={history.loading ? "Loading…" : `${rows.length} shown`}
                actions={<FilterGroup label="Filter by status" options={FILTERS} value={filter} onChange={setFilter} />}
            />
            {history.loading ? (
                <SkeletonRows label="Loading appointments" />
            ) : history.error ? (
                <LoadError message={history.error} onRetry={history.reload} />
            ) : rows.length === 0 ? (
                <EmptyState icon="calendar" title="No appointments" description={filter === "ALL" ? "Appointments booked with you will appear here." : "None with this status."} />
            ) : (
                <DataTable
                    caption="My appointments"
                    rows={rows}
                    columns={[
                        {
                            key: "patient",
                            header: "Patient",
                            render: (a) => (
                                <>
                                    <span className="font-medium text-slate-900">{fullName(a.patientFirstName, a.patientLastName)}</span>
                                    <span className="block text-xs text-slate-600">{a.patientPhone}</span>
                                </>
                            ),
                        },
                        { key: "when", header: "When", className: "whitespace-nowrap", render: (a) => <>{formatDate(a.appointmentDateTime)} <span className="text-slate-600">{formatTime(a.appointmentDateTime)}</span></> },
                        { key: "reason", header: "Reason", hideOnMobile: true, render: (a) => a.reason || "—" },
                        { key: "status", header: "Status", render: (a) => <StatusBadge kind="appointment" value={a.appointmentStatus} /> },
                        {
                            key: "rx",
                            header: "Prescriptions",
                            render: (a) => {
                                const n = countFor(a.id);
                                return (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-slate-700">{n === 0 ? "None" : `${n} item${n === 1 ? "" : "s"}`}</span>
                                        {PRESCRIBABLE.includes(a.appointmentStatus) && (
                                            <Button size="sm" variant="secondary" icon="plus" onClick={() => onPrescribe(a)}
                                                    aria-label={`Prescribe for ${fullName(a.patientFirstName, a.patientLastName)}`}>
                                                Prescribe
                                            </Button>
                                        )}
                                    </div>
                                );
                            },
                        },
                    ]}
                />
            )}
        </Card>
    );
}
