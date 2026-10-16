import { useCallback, useState } from "react";
import appointmentService from "../../api/appointmentService";
import useLoader from "../../lib/useLoader";
import { formatDate, formatTime, fullName } from "../../lib/format";
import { Card, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import { LoadError } from "../../components/ui/Alert";
import { SkeletonRows } from "../../components/ui/Spinner";
import { FilterGroup } from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import AppointmentActions from "../appointments/AppointmentActions";
import useStatusChange, { FRONT_DESK_ACTIONS } from "../appointments/useStatusChange";

export default function AppointmentsPanel({ onChanged }) {
    const [range, setRange] = useState("today");
    const load = useCallback(
        () => (range === "today" ? appointmentService.getToday() : appointmentService.getAll())
            .then((r) => r.data.filter((a) => a.appointmentStatus)),
        [range],
    );
    const { data, loading, error, reload, setData } = useLoader(load, { initialData: [] });

    const { request, pendingId, dialog } = useStatusChange((updated) => {
        setData((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        onChanged?.();
    });

    return (
        <Card aria-busy={loading}>
            <CardHeader
                title={range === "today" ? "Today's appointments" : "All appointments"}
                description={loading ? "Loading…" : `${data.length} appointment${data.length === 1 ? "" : "s"}`}
                actions={
                    <>
                        <FilterGroup label="Show" value={range} onChange={setRange}
                                     options={[{ value: "today", label: "Today" }, { value: "all", label: "All" }]} />
                        <Button size="sm" variant="ghost" icon="refresh" onClick={reload} disabled={loading}>Refresh</Button>
                    </>
                }
            />
            {loading ? (
                <SkeletonRows label="Loading appointments" />
            ) : error ? (
                <LoadError message={error} onRetry={reload} />
            ) : data.length === 0 ? (
                <EmptyState icon="calendar" title={range === "today" ? "No appointments today" : "No appointments"}
                            description="Booked appointments will appear here." />
            ) : (
                <DataTable
                    caption="Appointments"
                    rows={data}
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
                        {
                            key: "when",
                            header: "When",
                            className: "whitespace-nowrap",
                            render: (a) => <>{formatDate(a.appointmentDateTime)} <span className="text-slate-600">{formatTime(a.appointmentDateTime)}</span></>,
                        },
                        { key: "doctor", header: "Doctor", render: (a) => `Dr. ${fullName(a.doctorFirstName, a.doctorLastName)}` },
                        { key: "reason", header: "Reason", hideOnMobile: true, className: "max-w-[14rem]", render: (a) => a.reason || "—" },
                        { key: "status", header: "Status", render: (a) => <StatusBadge kind="appointment" value={a.appointmentStatus} /> },
                        {
                            key: "actions",
                            header: "Actions",
                            render: (a) => <AppointmentActions appointment={a} actions={FRONT_DESK_ACTIONS} pendingId={pendingId} onAction={request} />,
                        },
                    ]}
                />
            )}
            {dialog}
        </Card>
    );
}
