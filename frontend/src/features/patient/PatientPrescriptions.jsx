import { useCallback } from "react";
import patientService from "../../api/patientService";
import useLoader from "../../lib/useLoader";
import { Card } from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import { LoadError } from "../../components/ui/Alert";
import { SkeletonRows } from "../../components/ui/Spinner";
import { formatDate, fullName } from "../../lib/format";

export default function PatientPrescriptions() {
    const load = useCallback(() => patientService.getMyPrescriptions().then((r) => r.data), []);
    const { data, loading, error, reload } = useLoader(load, { initialData: [] });

    return (
        <Card aria-busy={loading}>
            {loading ? (
                <SkeletonRows label="Loading prescriptions" />
            ) : error ? (
                <LoadError message={error} onRetry={reload} />
            ) : data.length === 0 ? (
                <EmptyState icon="pill" title="No prescriptions" description="Medication your doctor prescribes during a visit will be listed here." />
            ) : (
                <DataTable
                    caption="Your prescriptions"
                    rows={data}
                    columns={[
                        {
                            key: "drug",
                            header: "Medication",
                            render: (p) => (
                                <span className="font-medium text-slate-900">
                                    {p.drugName || `Drug #${p.drugId}`}
                                    {p.drugMilligrams ? <span className="font-normal text-slate-600"> {p.drugMilligrams} mg</span> : null}
                                </span>
                            ),
                        },
                        { key: "dosage", header: "Dosage", render: (p) => p.dossage },
                        { key: "duration", header: "Duration", render: (p) => p.duration },
                        { key: "qty", header: "Quantity", render: (p) => p.quantity },
                        { key: "notes", header: "Notes", render: (p) => p.notes || "—" },
                        {
                            key: "by",
                            header: "Prescribed",
                            render: (p) => (
                                <>
                                    {formatDate(p.createdOn)}
                                    {p.prescribedByLastName && (
                                        <span className="block text-xs text-slate-600">Dr. {fullName(p.prescribedByFirstName, p.prescribedByLastName)}</span>
                                    )}
                                </>
                            ),
                        },
                    ]}
                />
            )}
        </Card>
    );
}
