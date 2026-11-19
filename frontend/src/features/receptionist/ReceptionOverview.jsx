import StatCard from "../../components/ui/StatCard";
import { Card, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { LoadError } from "../../components/ui/Alert";
import { SkeletonRows } from "../../components/ui/Spinner";

export default function ReceptionOverview({ today, onNavigate }) {
    const count = (status) => (today.data || []).filter((a) => a.appointmentStatus === status).length;

    return (
        <div className="space-y-6">
            <section aria-labelledby="today-heading">
                <h2 id="today-heading" className="mb-3 text-sm font-semibold text-slate-700">Today</h2>
                {today.loading ? (
                    <Card><SkeletonRows rows={2} label="Loading today's appointments" /></Card>
                ) : today.error ? (
                    <Card><LoadError message={today.error} onRetry={today.reload} /></Card>
                ) : (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard label="Appointments" value={(today.data || []).length} icon="calendar" />
                        <StatCard label="Booked, not arrived" value={count("PENDING")} icon="clock" />
                        <StatCard label="Waiting" value={count("WAITING")} icon="users" />
                        <StatCard label="Completed" value={count("COMPLETED")} icon="checkCircle" />
                    </div>
                )}
            </section>

            <Card>
                <CardHeader title="Common tasks" />
                <div className="flex flex-wrap gap-2 px-5 py-4">
                    <Button icon="userPlus" onClick={() => onNavigate("register")}>Register a patient</Button>
                    <Button variant="secondary" icon="calendar" onClick={() => onNavigate("book")}>Book an appointment</Button>
                    <Button variant="secondary" icon="clock" onClick={() => onNavigate("appointments")}>Check patients in</Button>
                    <Button variant="secondary" icon="receipt" onClick={() => onNavigate("billing")}>Record a payment</Button>
                </div>
            </Card>
        </div>
    );
}
