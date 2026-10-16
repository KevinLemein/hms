import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import appointmentService from "../api/appointmentService";
import prescriptionService from "../api/prescriptionService";
import useLoader from "../lib/useLoader";
import { formatMoney } from "../lib/format";
import AppShell from "../components/AppShell";
import { PageHeader } from "../components/ui/Card";
import Tabs from "../components/ui/Tabs";
import StatCard from "../components/ui/StatCard";
import Alert from "../components/ui/Alert";
import useStatusChange from "../features/appointments/useStatusChange";
import QueuePanel from "../features/doctor/QueuePanel";
import DoctorAppointmentsPanel from "../features/doctor/DoctorAppointmentsPanel";
import DoctorPrescriptionsPanel from "../features/doctor/DoctorPrescriptionsPanel";
import PrescribeDialog from "../features/doctor/PrescribeDialog";

const TABS = [
    { key: "queue", label: "Today's queue", icon: "users" },
    { key: "appointments", label: "My appointments", icon: "calendar" },
    { key: "prescriptions", label: "Prescriptions", icon: "pill" },
];

const byStatus = (list, s) => (list || []).filter((a) => a.appointmentStatus === s).length;

export default function DoctorDashboard() {
    const { user } = useAuth();
    const { showSuccess } = useToast();
    const [activeTab, setActiveTab] = useState("queue");
    const [prescribing, setPrescribing] = useState(null);

    // appointments.doctor_id is the doctor's users.id, which is user.id here.
    const loadToday = useCallback(
        () => appointmentService.getTodayByDoctor(user.id).then((r) => r.data.filter((a) => a.appointmentStatus)),
        [user.id],
    );
    const today = useLoader(loadToday, { initialData: [] });

    const loadHistory = useCallback(async () => {
        const [appts, prescriptions] = await Promise.all([
            appointmentService.getByDoctor(user.id),
            prescriptionService.getMine(),
        ]);
        return { appointments: appts.data.filter((a) => a.appointmentStatus), prescriptions: Array.isArray(prescriptions) ? prescriptions : [] };
    }, [user.id]);
    const history = useLoader(loadHistory);

    const loadDrugs = useCallback(() => prescriptionService.getDrugs().then((d) => (Array.isArray(d) ? d : [])), []);
    const drugs = useLoader(loadDrugs, { initialData: [] });

    const statusChange = useStatusChange((updated) => {
        today.setData((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        history.setData((h) => h && { ...h, appointments: h.appointments.map((a) => (a.id === updated.id ? updated : a)) });
    });

    const onPrescribed = (res) => {
        setPrescribing(null);
        showSuccess(res.created
            ? `Prescription saved${res.data?.chargeAmount != null ? ` · ${formatMoney(res.data.chargeAmount)} added to the bill` : ""}`
            : "This prescription was already recorded — nothing was dispensed or charged again");
        history.reload();
        drugs.reload(); // stock changed
    };

    return (
        <AppShell>
            <PageHeader title={`Dr. ${user.lastName || user.username}`} description="Today's queue, your appointments and prescriptions." />

            <section aria-label="Today at a glance" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Today's appointments" value={today.loading ? "…" : (today.data || []).length} icon="calendar" />
                <StatCard label="Waiting" value={today.loading ? "…" : byStatus(today.data, "WAITING")} icon="clock" />
                <StatCard label="In consultation" value={today.loading ? "…" : byStatus(today.data, "IN_CONSULTATION")} icon="play" />
                <StatCard label="Completed" value={today.loading ? "…" : byStatus(today.data, "COMPLETED")} icon="checkCircle" />
            </section>

            {drugs.error && <Alert tone="warning" className="mb-4">The medication list couldn't be loaded, so prescribing is unavailable. {drugs.error}</Alert>}

            <Tabs label="Doctor sections" tabs={TABS} active={activeTab} onChange={setActiveTab}>
                {activeTab === "queue" && <QueuePanel today={today} statusChange={statusChange} onPrescribe={setPrescribing} />}
                {activeTab === "appointments" && <DoctorAppointmentsPanel history={history} onPrescribe={setPrescribing} />}
                {activeTab === "prescriptions" && <DoctorPrescriptionsPanel history={history} drugs={drugs.data || []} />}
            </Tabs>

            {statusChange.dialog}
            {prescribing && (
                <PrescribeDialog appointment={prescribing} drugs={drugs.data || []} onClose={() => setPrescribing(null)} onSaved={onPrescribed} />
            )}
        </AppShell>
    );
}
