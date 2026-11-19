import { useCallback } from "react";
import patientService from "../../api/patientService";
import useLoader from "../../lib/useLoader";
import { Card } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Alert, { LoadError } from "../../components/ui/Alert";
import { SkeletonRows } from "../../components/ui/Spinner";
import BillDetails from "../billing/BillDetails";

export default function PatientBills() {
    const load = useCallback(() => patientService.getMyBills().then((r) => r.data), []);
    const { data, loading, error, reload } = useLoader(load, { initialData: [] });

    if (loading) return <Card><SkeletonRows label="Loading bills" /></Card>;
    if (error) return <Card><LoadError message={error} onRetry={reload} /></Card>;
    if (data.length === 0) {
        return <Card><EmptyState icon="receipt" title="No bills" description="Charges from your visits will appear here." /></Card>;
    }

    const outstanding = data.some((b) => (b.status === "OPEN" || b.status === "PARTIALLY_PAID") && Number(b.balance) > 0);

    return (
        <div className="space-y-4">
            {outstanding && (
                <Alert tone="info">You have a balance due. Payments are made at the reception desk.</Alert>
            )}
            {data.map((bill) => <BillDetails key={bill.id} bill={bill} />)}
        </div>
    );
}
