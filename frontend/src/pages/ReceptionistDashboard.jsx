import { useCallback, useState } from "react";
import appointmentService from "../api/appointmentService";
import { useToast } from "../context/ToastContext";
import useLoader from "../lib/useLoader";
import AppShell from "../components/AppShell";
import { PageHeader } from "../components/ui/Card";
import Tabs from "../components/ui/Tabs";
import ReceptionOverview from "../features/receptionist/ReceptionOverview";
import RegisterPatientForm from "../features/receptionist/RegisterPatientForm";
import PatientsPanel from "../features/receptionist/PatientsPanel";
import BookAppointmentForm from "../features/receptionist/BookAppointmentForm";
import AppointmentsPanel from "../features/receptionist/AppointmentsPanel";
import BillingPanel from "../features/receptionist/BillingPanel";
import CredentialsDialog from "../features/receptionist/CredentialsDialog";

const TABS = [
    { key: "overview", label: "Overview", icon: "activity" },
    { key: "appointments", label: "Appointments", icon: "clock" },
    { key: "book", label: "Book appointment", icon: "calendar" },
    { key: "register", label: "Register patient", icon: "userPlus" },
    { key: "patients", label: "Patients", icon: "users" },
    { key: "billing", label: "Billing", icon: "receipt" },
];

export default function ReceptionistDashboard() {
    const { showSuccess } = useToast();
    const [activeTab, setActiveTab] = useState("overview");
    const [credentials, setCredentials] = useState(null);

    // Today's appointments feed the Overview counts.
    const loadToday = useCallback(
        () => appointmentService.getToday().then((r) => r.data.filter((a) => a.appointmentStatus)),
        [],
    );
    const today = useLoader(loadToday, { initialData: [] });

    return (
        <AppShell>
            <PageHeader title="Reception" description="Register patients, book appointments, manage the queue and take payments." />
            <Tabs label="Reception sections" tabs={TABS} active={activeTab} onChange={setActiveTab}>
                {activeTab === "overview" && <ReceptionOverview today={today} onNavigate={setActiveTab} />}
                {activeTab === "appointments" && <AppointmentsPanel onChanged={today.reload} />}
                {activeTab === "book" && (
                    <BookAppointmentForm
                        onBooked={(a) => {
                            showSuccess(`Appointment booked for ${a.patientFirstName} ${a.patientLastName}`);
                            today.reload();
                        }}
                    />
                )}
                {activeTab === "register" && (
                    <RegisterPatientForm
                        onRegistered={(patient, bookingError) => {
                            setCredentials({ patient, bookingError });
                            if (!bookingError) showSuccess(`${patient.firstName} ${patient.lastName} registered and booked`);
                            today.reload();
                        }}
                    />
                )}
                {activeTab === "patients" && <PatientsPanel />}
                {activeTab === "billing" && <BillingPanel />}
            </Tabs>

            {credentials && (
                <CredentialsDialog
                    patient={credentials.patient}
                    bookingError={credentials.bookingError}
                    onClose={() => setCredentials(null)}
                />
            )}
        </AppShell>
    );
}
