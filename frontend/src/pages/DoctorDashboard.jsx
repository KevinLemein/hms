import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import appointmentService from "../api/appointmentService";

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [todayAppointments, setTodayAppointments] = useState([]);
    const [allAppointments, setAllAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState("");

    useEffect(() => {
        fetchTodayAppointments();
    }, []);

    useEffect(() => {
        if (activeTab === "all") fetchAllAppointments();
    }, [activeTab]);

    const fetchTodayAppointments = async () => {
        setLoading(true);
        try {
            const response = await appointmentService.getTodayByDoctor(user.id);
            if (response.success) setTodayAppointments(response.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchAllAppointments = async () => {
        try {
            const response = await appointmentService.getByDoctor(user.id);
            if (response.success) setAllAppointments(response.data);
        } catch (err) { console.error(err); }
    };

    const handleStatusUpdate = async (id, status, notes = "") => {
        try {
            const response = await appointmentService.updateStatus(id, status, notes);
            if (response.success) {
                setTodayAppointments(prev => prev.map(a => a.id === id ? response.data : a));
                setAllAppointments(prev => prev.map(a => a.id === id ? response.data : a));
                setSuccess("Status updated");
                setTimeout(() => setSuccess(""), 3000);
            }
        } catch (err) { console.error(err); }
    };

    const counts = {
        total: todayAppointments.length,
        waiting: todayAppointments.filter(a => a.status === "WAITING").length,
        inConsultation: todayAppointments.filter(a => a.status === "IN_CONSULTATION").length,
        completed: todayAppointments.filter(a => a.status === "COMPLETED").length,
    };

    const statusColors = {
        PENDING: "bg-slate-100 text-slate-700",
        WAITING: "bg-amber-100 text-amber-700",
        IN_CONSULTATION: "bg-blue-100 text-blue-700",
        COMPLETED: "bg-emerald-100 text-emerald-700",
        CANCELLED: "bg-red-100 text-red-700",
        NO_SHOW: "bg-gray-100 text-gray-700",
    };

    const statusActions = {
        WAITING: [{ label: "Start Consultation", next: "IN_CONSULTATION" }],
        IN_CONSULTATION: [{ label: "Complete", next: "COMPLETED" }],
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex gap-1 mb-8 bg-white rounded-lg border border-slate-200 p-1 w-fit">
                    {[
                        { key: "dashboard", label: "Dashboard" },
                        { key: "queue", label: "Patient Queue" },
                        { key: "all", label: "All Appointments" },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {success && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{success}</div>
                )}

                {/* DASHBOARD */}
                {activeTab === "dashboard" && (
                    <>
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">Doctor Dashboard</h1>
                            <p className="text-slate-500 mt-1">Manage your patients and appointments</p>
                        </div>

                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                            {[
                                { title: "Patient Queue", desc: "View today's waiting patients", icon: "👨‍⚕️", color: "border-blue-100 bg-blue-50 hover:border-blue-300", onClick: () => setActiveTab("queue") },
                                { title: "All Appointments", desc: "View your full schedule", icon: "📅", color: "border-teal-100 bg-teal-50 hover:border-teal-300", onClick: () => setActiveTab("all") },
                                { title: "Medical Records", desc: "Add diagnosis and notes", icon: "📋", color: "border-emerald-100 bg-emerald-50 hover:border-emerald-300", disabled: true },
                            ].map((a, i) => (
                                <div key={i} onClick={a.disabled ? undefined : a.onClick}
                                     className={`p-6 rounded-xl border-2 transition-all duration-200 ${a.color} ${a.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-md"}`}>
                                    <span className="text-3xl">{a.icon}</span>
                                    <h3 className="text-lg font-semibold text-slate-800 mt-3">{a.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{a.desc}</p>
                                    {a.disabled && <span className="inline-block mt-3 px-2 py-0.5 bg-slate-200 text-slate-500 text-xs rounded-full">Coming Soon</span>}
                                </div>
                            ))}
                        </div>

                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Today's Overview</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Total Patients", value: counts.total, icon: "🧑" },
                                { label: "Waiting", value: counts.waiting, icon: "🪑" },
                                { label: "In Consultation", value: counts.inConsultation, icon: "🩺" },
                                { label: "Completed", value: counts.completed, icon: "✅" },
                            ].map((s, i) => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{s.label}</p><span>{s.icon}</span></div>
                                    <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* PATIENT QUEUE */}
                {activeTab === "queue" && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-800">Patient Queue</h1>
                            <p className="text-slate-500 mt-1">Today's patients — {counts.waiting} waiting, {counts.inConsultation} in consultation</p>
                        </div>
                        {loading ? (
                            <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto" /></div>
                        ) : todayAppointments.filter(a => ["WAITING", "IN_CONSULTATION"].includes(a.status)).length === 0 ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">No patients in queue</div>
                        ) : (
                            <div className="space-y-4">
                                {todayAppointments
                                    .filter(a => ["WAITING", "IN_CONSULTATION"].includes(a.status))
                                    .map(a => (
                                        <div key={a.id} className={`bg-white rounded-xl border-2 p-5 ${a.status === "IN_CONSULTATION" ? "border-blue-300" : "border-slate-200"}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-lg font-bold text-teal-700">
                                                        {a.patientFirstName[0]}{a.patientLastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-semibold text-slate-800">{a.patientFirstName} {a.patientLastName}</p>
                                                        <p className="text-sm text-slate-500">{a.patientPhone} | {new Date(a.appointmentDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                                        {a.reason && <p className="text-sm text-slate-500 mt-1">Reason: {a.reason}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[a.status]}`}>
                            {a.status.replace("_", " ")}
                          </span>
                                                    {(statusActions[a.status] || []).map((action, i) => (
                                                        <button key={i} onClick={() => handleStatusUpdate(a.id, action.next)}
                                                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-all">
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </>
                )}

                {/* ALL APPOINTMENTS */}
                {activeTab === "all" && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-800">All Appointments</h1>
                            <p className="text-slate-500 mt-1">{allAppointments.length} total appointments</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {allAppointments.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No appointments found</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date & Time</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Reason</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                        {allAppointments.map(a => (
                                            <tr key={a.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-sm text-slate-800">
                                                    {new Date(a.appointmentDateTime).toLocaleDateString()} {new Date(a.appointmentDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-slate-800">{a.patientFirstName} {a.patientLastName}</p>
                                                    <p className="text-xs text-slate-500">{a.patientPhone}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{a.reason || "—"}</td>
                                                <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[a.status]}`}>
                              {a.status.replace("_", " ")}
                            </span>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}