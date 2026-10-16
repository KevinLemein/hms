import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import patientService from "../api/patientService";
import useLoader from "../lib/useLoader";
import AppShell from "../components/AppShell";
import { PageHeader, Card } from "../components/ui/Card";
import Tabs from "../components/ui/Tabs";
import { LoadError } from "../components/ui/Alert";
import { PageSpinner } from "../components/ui/Spinner";
import PatientOverview from "../features/patient/PatientOverview";
import PatientAppointments from "../features/patient/PatientAppointments";
import PatientPrescriptions from "../features/patient/PatientPrescriptions";
import PatientBills from "../features/patient/PatientBills";

const TABS = [
    { key: "overview", label: "Overview", icon: "user" },
    { key: "appointments", label: "Appointments", icon: "calendar" },
    { key: "prescriptions", label: "Prescriptions", icon: "pill" },
    { key: "bills", label: "Bills", icon: "receipt" },
];

// All data comes from /patients/me/** -- the backend resolves the patient
// from the token, so nothing here sends a patient or user id.
export default function PatientDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("overview");

    // Profile and appointments are shared by the Overview and Appointments tabs.
    const load = useCallback(async () => {
        const [profile, appointments] = await Promise.all([
            patientService.getMe(),
            patientService.getMyAppointments(),
        ]);
        return { patient: profile.data, appointments: appointments.data.filter((a) => a.appointmentStatus) };
    }, []);
    const { data, loading, error, reload } = useLoader(load);

    const name = data?.patient?.firstName ?? user.firstName;

    return (
        <AppShell>
            <PageHeader title={name ? `Welcome, ${name}` : "My health record"} description="Your appointments, prescriptions and bills." />

            {loading ? (
                <PageSpinner label="Loading your record" />
            ) : error ? (
                <Card><LoadError message={error} onRetry={reload} /></Card>
            ) : (
                <Tabs label="Patient sections" tabs={TABS} active={activeTab} onChange={setActiveTab}>
                    {activeTab === "overview" && <PatientOverview patient={data.patient} appointments={data.appointments} />}
                    {activeTab === "appointments" && <PatientAppointments appointments={data.appointments} />}
                    {activeTab === "prescriptions" && <PatientPrescriptions />}
                    {activeTab === "bills" && <PatientBills />}
                </Tabs>
            )}
        </AppShell>
    );
}
