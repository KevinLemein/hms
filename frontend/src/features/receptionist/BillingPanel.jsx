import { useCallback, useState } from "react";
import billService from "../../api/billService";
import { useToast } from "../../context/ToastContext";
import useLoader from "../../lib/useLoader";
import { Card, CardHeader } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import { LoadError } from "../../components/ui/Alert";
import { SkeletonRows } from "../../components/ui/Spinner";
import { FilterGroup } from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import BillDetails from "../billing/BillDetails";
import AddChargeDialog from "./AddChargeDialog";
import RecordPaymentDialog from "./RecordPaymentDialog";

// Filters use the backend's BillStatus values (the old "PENDING" filter
// requested a status that doesn't exist and always failed).
const FILTERS = [
    { value: "ALL", label: "All" },
    { value: "OPEN", label: "Unpaid" },
    { value: "PARTIALLY_PAID", label: "Partially paid" },
    { value: "PAID", label: "Paid" },
    { value: "CANCELLED", label: "Cancelled" },
];

const PAYABLE = ["OPEN", "PARTIALLY_PAID"];

export default function BillingPanel() {
    const { showSuccess } = useToast();
    const [filter, setFilter] = useState("ALL");
    const [page, setPage] = useState(0);
    const [dialog, setDialog] = useState(null); // { type: "charge" | "payment", bill }

    const load = useCallback(async () => {
        if (filter === "ALL") return (await billService.getAll(page)).data;
        const res = await billService.getByStatus(filter);
        return { content: res.data, page: 0, totalPages: 1, totalElements: res.data.length };
    }, [filter, page]);
    const { data, loading, error, reload, setData } = useLoader(load);
    const bills = data?.content || [];

    const changeFilter = (value) => { setFilter(value); setPage(0); };

    const onSaved = (updated, message) => {
        setDialog(null);
        showSuccess(message);
        // Replace the bill in place; it may also have moved out of the current filter.
        setData((d) => ({
            ...d,
            content: d.content
                .map((b) => (b.id === updated.id ? updated : b))
                .filter((b) => filter === "ALL" || b.status === filter),
        }));
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader
                    title="Bills"
                    description="Consultation and medication charges are added automatically. Add other charges and record payments here."
                    actions={<Button size="sm" variant="ghost" icon="refresh" onClick={reload} disabled={loading}>Refresh</Button>}
                />
                <div className="px-5 py-3">
                    <FilterGroup label="Bill status" options={FILTERS} value={filter} onChange={changeFilter} />
                </div>
            </Card>

            <div aria-busy={loading} className="space-y-4">
                {loading ? (
                    <Card><SkeletonRows label="Loading bills" /></Card>
                ) : error ? (
                    <Card><LoadError message={error} onRetry={reload} /></Card>
                ) : bills.length === 0 ? (
                    <Card><EmptyState icon="receipt" title="No bills" description={filter === "ALL" ? "Bills are created when appointments are booked." : "No bills have this status."} /></Card>
                ) : (
                    <>
                        {bills.map((bill) => (
                            <BillDetails
                                key={bill.id}
                                bill={bill}
                                showPatient
                                actions={PAYABLE.includes(bill.status) && (
                                    <>
                                        {Number(bill.balance) > 0 && (
                                            <Button size="sm" icon="cash" onClick={() => setDialog({ type: "payment", bill })}>Record payment</Button>
                                        )}
                                        <Button size="sm" variant="secondary" icon="plus" onClick={() => setDialog({ type: "charge", bill })}>Add charge</Button>
                                    </>
                                )}
                            />
                        ))}
                        {filter === "ALL" && data.totalPages > 1 && (
                            <Card>
                                <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} disabled={loading} />
                            </Card>
                        )}
                    </>
                )}
            </div>

            {dialog?.type === "charge" && <AddChargeDialog bill={dialog.bill} onClose={() => setDialog(null)} onSaved={onSaved} />}
            {dialog?.type === "payment" && <RecordPaymentDialog bill={dialog.bill} onClose={() => setDialog(null)} onSaved={onSaved} />}
        </div>
    );
}
