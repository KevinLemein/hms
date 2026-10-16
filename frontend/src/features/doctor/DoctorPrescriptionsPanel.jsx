import { Card, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import { LoadError } from "../../components/ui/Alert";
import { SkeletonRows } from "../../components/ui/Spinner";
import { formatDate, fullName } from "../../lib/format";

/**
 * Prescriptions this doctor issued (GET /api/prescriptions/mine, scoped by
 * the server). Patient names come from the doctor's own appointments.
 */
export default function DoctorPrescriptionsPanel({ history, drugs }) {
    const { appointments = [], prescriptions = [] } = history.data || {};
    const byId = new Map(appointments.map((a) => [a.id, a]));
    const mine = prescriptions
        .filter((p) => byId.has(p.appointmentId))
        .sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    const drugName = (id) => {
        const d = drugs.find((x) => x.id === id);
        return d ? `${d.name}${d.milligrams ? ` ${d.milligrams} mg` : ""}` : `Drug #${id}`;
    };

    return (
        <Card aria-busy={history.loading}>
            <CardHeader title="Prescriptions I've issued" description={history.loading ? "Loading…" : `${mine.length} prescriptions`} />
            {history.loading ? (
                <SkeletonRows label="Loading prescriptions" />
            ) : history.error ? (
                <LoadError message={history.error} onRetry={history.reload} />
            ) : mine.length === 0 ? (
                <EmptyState icon="pill" title="No prescriptions yet" description="Prescribe from the queue or from My appointments." />
            ) : (
                <DataTable
                    caption="Prescriptions I've issued"
                    rows={mine}
                    columns={[
                        { key: "drug", header: "Medication", render: (p) => <span className="font-medium text-slate-900">{drugName(p.drugId)}</span> },
                        {
                            key: "patient",
                            header: "Patient",
                            render: (p) => {
                                const a = byId.get(p.appointmentId);
                                return fullName(a.patientFirstName, a.patientLastName);
                            },
                        },
                        { key: "dosage", header: "Dosage", render: (p) => p.dossage },
                        { key: "duration", header: "Duration", render: (p) => p.duration },
                        { key: "qty", header: "Qty", render: (p) => p.quantity },
                        { key: "notes", header: "Notes", hideOnMobile: true, render: (p) => p.notes || "—" },
                        { key: "date", header: "Date", className: "whitespace-nowrap", render: (p) => formatDate(p.createdOn) },
                    ]}
                />
            )}
        </Card>
    );
}
