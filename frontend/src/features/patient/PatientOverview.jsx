import { Card, CardHeader, DetailList } from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import { formatDate, formatDateTime, fullName } from "../../lib/format";
import { statusLabel } from "../../lib/statuses";

const UPCOMING = ["PENDING", "WAITING"];

export default function PatientOverview({ patient, appointments }) {
    const upcoming = appointments
        .filter((a) => UPCOMING.includes(a.appointmentStatus))
        .sort((a, b) => new Date(a.appointmentDateTime) - new Date(b.appointmentDateTime));
    const completed = appointments.filter((a) => a.appointmentStatus === "COMPLETED");
    const lastVisit = completed[0]; // API returns newest first

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Total visits" value={appointments.length} icon="calendar" />
                <StatCard label="Upcoming" value={upcoming.length} icon="clock" />
                <StatCard label="Completed" value={completed.length} icon="checkCircle" />
                <StatCard label="Last visit" value={lastVisit ? formatDate(lastVisit.appointmentDateTime) : "—"} icon="activity" />
            </div>

            {upcoming.length > 0 && (
                <Card>
                    <CardHeader title="Next appointment" />
                    <div className="px-5 py-4 text-sm text-slate-800">
                        <p className="font-medium">{formatDateTime(upcoming[0].appointmentDateTime)}</p>
                        <p className="text-slate-600">
                            Dr. {fullName(upcoming[0].doctorFirstName, upcoming[0].doctorLastName)} · {statusLabel("appointment", upcoming[0].appointmentStatus)}
                        </p>
                    </div>
                </Card>
            )}

            <Card>
                <CardHeader title="Personal information" description="Contact the reception desk to correct any of these details." />
                <div className="px-5 py-4">
                    <DetailList
                        items={[
                            { label: "Email", value: patient.email },
                            { label: "Phone", value: patient.phoneNumber },
                            { label: "Date of birth", value: formatDate(patient.dateOfBirth) },
                            { label: "Gender", value: patient.gender && patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase() },
                            { label: "Address", value: patient.address },
                            {
                                label: "Emergency contact",
                                value: patient.emergencyContactName
                                    ? `${patient.emergencyContactName}${patient.emergencyContactPhone ? ` · ${patient.emergencyContactPhone}` : ""}`
                                    : null,
                            },
                            { label: "Known allergies", value: patient.allergies || "None recorded", emphasis: !!patient.allergies },
                        ]}
                    />
                </div>
            </Card>
        </div>
    );
}
