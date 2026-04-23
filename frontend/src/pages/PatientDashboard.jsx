import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import patientService from "../api/patientService";
import appointmentService from "../api/appointmentService";
import prescriptionService from "../api/prescriptionService";
import billService from "../api/billService";

export default function PatientDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [patient, setPatient] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [drugs, setDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bills, setBills] = useState([]);

    useEffect(() => {
        loadPatientProfile();
    }, []);

    useEffect(() => {
        if (!patient) return;
        if (activeTab === "appointments") fetchAppointments();
        if (activeTab === "prescriptions") fetchPrescriptions();
        if (activeTab === "bills") fetchBills();
    }, [activeTab, patient]);

    const loadPatientProfile = async () => {
        try {
            const res = await patientService.getByUserId(user.id);
            if (res.success) {
                setPatient(res.data);
                // Load appointments for dashboard stats
                const apptRes = await appointmentService.getByPatient(res.data.id);
                if (apptRes.success) setAppointments(apptRes.data.filter(a => a.appointmentStatus));
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchAppointments = async () => {
        if (!patient) return;
        try {
            const res = await appointmentService.getByPatient(patient.id);
            if (res.success) setAppointments(res.data.filter(a => a.appointmentStatus));
        } catch (err) { console.error(err); }
    };

    const fetchPrescriptions = async () => {
        try {
            const [prescData, drugsData] = await Promise.all([
                prescriptionService.getAll(),
                prescriptionService.getDrugs(),
            ]);
            setPrescriptions(Array.isArray(prescData) ? prescData : []);
            setDrugs(Array.isArray(drugsData) ? drugsData : []);
        } catch (err) { console.error(err); }
    };

    const fetchBills = async () => {
        if (!patient) return;
        try {
            const res = await billService.getByPatient(patient.id);
            if (res.success) setBills(res.data);
        } catch (err) { console.error(err); }
    };

    // Filter prescriptions to only this patient's (match via appointmentId)
    const myPrescriptions = prescriptions.filter(p =>
        appointments.some(a => a.id === p.appointmentId)
    );

    const upcomingAppointments = appointments.filter(a =>
        ["PENDING", "WAITING"].includes(a.appointmentStatus)
    );
    const completedAppointments = appointments.filter(a =>
        a.appointmentStatus === "COMPLETED"
    );

    const statusColors = {
        PENDING: "bg-slate-100 text-slate-700",
        WAITING: "bg-amber-100 text-amber-700",
        IN_CONSULTATION: "bg-blue-100 text-blue-700",
        COMPLETED: "bg-emerald-100 text-emerald-700",
        CANCELLED: "bg-red-100 text-red-700",
        NO_SHOW: "bg-gray-100 text-gray-700",
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Tab Bar */}
                <div className="flex gap-1 mb-8 bg-white rounded-lg border border-slate-200 p-1 w-fit flex-wrap">
                    {[
                        { key: "dashboard", label: "Dashboard" },
                        { key: "appointments", label: "My Appointments" },
                        { key: "prescriptions", label: "My Prescriptions" },
                        { key: "bills", label: "My Bills" },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                activeTab === tab.key ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ==================== DASHBOARD ==================== */}
                {activeTab === "dashboard" && (
                    <>
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">
                                Welcome, {user.firstName} {user.lastName}
                            </h1>
                            <p className="text-slate-500 mt-1">Your health information at a glance</p>
                        </div>

                        {/* Patient Info Card */}
                        {patient && (
                            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Personal Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400">Email</p>
                                        <p className="text-sm font-medium text-slate-800">{patient.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Phone</p>
                                        <p className="text-sm font-medium text-slate-800">{patient.phoneNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Date of Birth</p>
                                        <p className="text-sm font-medium text-slate-800">{patient.dateOfBirth}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Gender</p>
                                        <p className="text-sm font-medium text-slate-800">{patient.gender}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Address</p>
                                        <p className="text-sm font-medium text-slate-800">{patient.address}</p>
                                    </div>
                                    {patient.allergies && (
                                        <div>
                                            <p className="text-xs text-slate-400">Allergies</p>
                                            <p className="text-sm font-medium text-red-600">{patient.allergies}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                            {[
                                { title: "My Appointments", desc: "View upcoming and past appointments", icon: "📅", color: "border-teal-100 bg-teal-50 hover:border-teal-300", onClick: () => setActiveTab("appointments") },
                                { title: "My Prescriptions", desc: "View your prescribed medications", icon: "💊", color: "border-blue-100 bg-blue-50 hover:border-blue-300", onClick: () => setActiveTab("prescriptions") },
                                { title: "Emergency Contact", desc: patient ? `${patient.emergencyContactName || "Not set"} - ${patient.emergencyContactPhone || ""}` : "Loading...", icon: "🆘", color: "border-red-100 bg-red-50 hover:border-red-300", onClick: () => {} },
                            ].map((a, i) => (
                                <div key={i} onClick={a.onClick} className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${a.color}`}>
                                    <span className="text-3xl">{a.icon}</span>
                                    <h3 className="text-lg font-semibold text-slate-800 mt-3">{a.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{a.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Health Summary */}
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Health Summary</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Total Visits", value: appointments.length, icon: "🏥" },
                                { label: "Upcoming", value: upcomingAppointments.length, icon: "📅" },
                                { label: "Completed", value: completedAppointments.length, icon: "✅" },
                                { label: "Last Visit", value: completedAppointments.length > 0
                                        ? new Date(completedAppointments[0].appointmentDateTime).toLocaleDateString([], { day: "2-digit", month: "short" })
                                        : "—", icon: "📆" },
                            ].map((s, i) => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-slate-500">{s.label}</p>
                                        <span>{s.icon}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ==================== APPOINTMENTS ==================== */}
                {activeTab === "appointments" && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-800">My Appointments</h1>
                            <p className="text-slate-500 mt-1">{appointments.length} total appointments</p>
                        </div>

                        {appointments.length === 0 ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                                No appointments found. Your receptionist will book appointments for you.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {appointments.map(a => (
                                    <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-lg font-bold text-teal-700">
                                                    {a.appointmentDateTime
                                                        ? new Date(a.appointmentDateTime).toLocaleDateString([], { day: "2-digit" })
                                                        : "—"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        {a.appointmentDateTime
                                                            ? new Date(a.appointmentDateTime).toLocaleDateString([], { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                                                            : "—"}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {a.appointmentDateTime
                                                            ? new Date(a.appointmentDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                                            : "—"}
                                                        {" | Dr. "}{a.doctorFirstName} {a.doctorLastName}
                                                    </p>
                                                    {a.reason && <p className="text-sm text-slate-400 mt-1">Reason: {a.reason}</p>}
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[a.appointmentStatus] || "bg-slate-100 text-slate-700"}`}>
                                                {(a.appointmentStatus || "UNKNOWN").replace("_", " ")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ==================== PRESCRIPTIONS ==================== */}
                {activeTab === "prescriptions" && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-800">My Prescriptions</h1>
                            <p className="text-slate-500 mt-1">{myPrescriptions.length} prescriptions</p>
                        </div>

                        {myPrescriptions.length === 0 ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                                No prescriptions found. Your doctor will create prescriptions during consultations.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myPrescriptions.map((p, index) => {
                                    const drug = drugs.find(d => d.id === p.drugId);
                                    const appointment = appointments.find(a => a.id === p.appointmentId);
                                    return (
                                        <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                            <div className="flex items-start justify-between flex-wrap gap-3">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-lg">
                                                        💊
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-semibold text-slate-800">
                                                            {drug ? `${drug.name} (${drug.milligrams})` : `Drug #${p.drugId}`}
                                                        </p>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            Dosage: {p.dossage} | Duration: {p.duration}
                                                        </p>
                                                        {p.notes && (
                                                            <p className="text-sm text-slate-400 mt-1">Notes: {p.notes}</p>
                                                        )}
                                                        {appointment && (
                                                            <p className="text-xs text-slate-400 mt-2">
                                                                Prescribed by Dr. {appointment.doctorFirstName} {appointment.doctorLastName}
                                                                {" | "}
                                                                {p.createdOn ? new Date(p.createdOn).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ==================== BILLS ==================== */}
                
                {activeTab === "bills" && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-800">My Bills</h1>
                            <p className="text-slate-500 mt-1">{bills.length} bills</p>
                        </div>

                        {bills.length === 0 ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                                No bills found.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {bills.map(bill => (
                                    <div key={bill.id} className="bg-white rounded-xl border border-slate-200 p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <p className="text-base font-semibold text-slate-800">
                                                    Bill #{bill.id}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString([], { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                bill.paymentStatus === "PAID"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-amber-100 text-amber-700"
                                            }`}>
                                {bill.paymentStatus}
                            </span>
                                        </div>

                                        {/* Line items */}
                                        {bill.items && bill.items.length > 0 && (
                                            <div className="border-t border-slate-100 pt-3 space-y-2">
                                                {bill.items.map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">
                                            {item.description} × {item.quantity}
                                        </span>
                                                        <span className="text-slate-800 font-medium">
                                            KES {item.totalPrice?.toFixed(2)}
                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Total */}
                                        <div className="border-t border-slate-200 mt-3 pt-3 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-slate-800">Total</span>
                                            <span className="text-lg font-bold text-slate-800">
                                KES {bill.totalAmount?.toFixed(2)}
                            </span>
                                        </div>

                                        {/* Payment info if paid */}
                                        {bill.paymentStatus === "PAID" && (
                                            <div className="mt-3 bg-emerald-50 rounded-lg p-3 text-sm text-emerald-700">
                                                Paid via {bill.paymentMethod}
                                                {bill.paymentReference && ` — Ref: ${bill.paymentReference}`}
                                                {bill.paidAt && ` — ${new Date(bill.paidAt).toLocaleDateString()}`}
                                            </div>
                                        )}

                                        {bill.paymentStatus === "PENDING" && (
                                            <div className="mt-3 bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
                                                Payment pending — please visit the reception desk to make your payment.
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}