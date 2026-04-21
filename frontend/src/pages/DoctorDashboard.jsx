import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import appointmentService from "../api/appointmentService";
import prescriptionService from "../api/prescriptionService";
import patientService from "../api/patientService";

export default function DoctorDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("dashboard");
    const [todayAppointments, setTodayAppointments] = useState([]);
    const [allAppointments, setAllAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [drugs, setDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState("");
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(null);

    // Load drugs once on mount (cached for modal + prescriptions table)
    useEffect(() => {
        const loadDrugs = async () => {
            try {
                const data = await prescriptionService.getDrugs();
                setDrugs(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to load drugs:", err);
            }
        };
        loadDrugs();
        fetchTodayAppointments();
    }, []);

    useEffect(() => {
        if (activeTab === "all" || activeTab === "prescriptions") {
            fetchAllAppointments();
            fetchPrescriptions();
        }
    }, [activeTab]);

    const fetchTodayAppointments = async () => {
        setLoading(true);
        try {
            const response = await appointmentService.getTodayByDoctor(user.id);
            if (response.success) setTodayAppointments(response.data.filter(a => a.appointmentStatus));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchAllAppointments = async () => {
        try {
            const response = await appointmentService.getByDoctor(user.id);
            if (response.success) setAllAppointments(response.data.filter(a => a.appointmentStatus));
        } catch (err) { console.error(err); }
    };

    const fetchPrescriptions = async () => {
        try {
            const prescData = await prescriptionService.getAll();
            setPrescriptions(Array.isArray(prescData) ? prescData : []);
        } catch (err) { console.error(err); }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const response = await appointmentService.updateStatus(id, status);
            if (response.success) {
                setTodayAppointments(prev => prev.map(a => a.id === id ? response.data : a));
                setAllAppointments(prev => prev.map(a => a.id === id ? response.data : a));
                setSuccess("Status updated");
                setTimeout(() => setSuccess(""), 3000);
            }
        } catch (err) { console.error(err); }
    };

    const handlePrescriptionCreated = () => {
        setShowPrescriptionModal(null);
        setSuccess("Prescription created successfully");
        setTimeout(() => setSuccess(""), 3000);
        fetchPrescriptions();
    };

    const counts = {
        total: todayAppointments.length,
        waiting: todayAppointments.filter(a => a.appointmentStatus === "WAITING").length,
        inConsultation: todayAppointments.filter(a => a.appointmentStatus === "IN_CONSULTATION").length,
        completed: todayAppointments.filter(a => a.appointmentStatus === "COMPLETED").length,
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
                {/* Tab Bar */}
                <div className="flex gap-1 mb-8 bg-white rounded-lg border border-slate-200 p-1 w-fit flex-wrap">
                    {[
                        { key: "dashboard", label: "Dashboard" },
                        { key: "all", label: "All Appointments" },
                        { key: "prescriptions", label: "Prescriptions" },
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

                {success && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
                        {success}
                    </div>
                )}

                {/* ==================== DASHBOARD TAB ==================== */}
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
                                { title: "Prescriptions", desc: "View and create prescriptions", icon: "💊", color: "border-violet-100 bg-violet-50 hover:border-violet-300", onClick: () => setActiveTab("prescriptions") },
                            ].map((a, i) => (
                                <div key={i} onClick={a.onClick} className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${a.color}`}>
                                    <span className="text-3xl">{a.icon}</span>
                                    <h3 className="text-lg font-semibold text-slate-800 mt-3">{a.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{a.desc}</p>
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

                {/* ==================== PATIENT QUEUE TAB ==================== */}
                {activeTab === "queue" && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-800">Patient Queue</h1>
                            <p className="text-slate-500 mt-1">Today — {counts.waiting} waiting, {counts.inConsultation} in consultation</p>
                        </div>
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto" />
                            </div>
                        ) : todayAppointments.filter(a => ["WAITING", "IN_CONSULTATION"].includes(a.appointmentStatus)).length === 0 ? (
                            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">No patients in queue</div>
                        ) : (
                            <div className="space-y-4">
                                {todayAppointments.filter(a => ["WAITING", "IN_CONSULTATION"].includes(a.appointmentStatus)).map(a => (
                                    <div key={a.id} className={`bg-white rounded-xl border-2 p-5 ${a.appointmentStatus === "IN_CONSULTATION" ? "border-blue-300" : "border-slate-200"}`}>
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-lg font-bold text-teal-700">
                                                    {a.patientFirstName?.[0]}{a.patientLastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-base font-semibold text-slate-800">{a.patientFirstName} {a.patientLastName}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {a.patientPhone} | {new Date(a.appointmentDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                    {a.reason && <p className="text-sm text-slate-500 mt-1">Reason: {a.reason}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[a.appointmentStatus] || "bg-slate-100 text-slate-700"}`}>
                                                    {(a.appointmentStatus || "UNKNOWN").replace("_", " ")}
                                                </span>
                                                {a.appointmentStatus === "IN_CONSULTATION" && (
                                                    <button
                                                        onClick={() => setShowPrescriptionModal({
                                                            patientId: a.patientId,
                                                            patientName: `${a.patientFirstName} ${a.patientLastName}`,
                                                            patientEmail: a.patientEmail,
                                                            patientPhone: a.patientPhone,
                                                            appointmentId: a.id,
                                                        })}
                                                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-all"
                                                    >
                                                        Prescribe
                                                    </button>
                                                )}
                                                {(statusActions[a.appointmentStatus] || []).map((action, i) => (
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

                {/* ==================== ALL APPOINTMENTS TAB ==================== */}
                {activeTab === "all" && (
                    <AllAppointmentsView
                        appointments={allAppointments}
                        statusColors={statusColors}
                        prescriptions={prescriptions}
                        onPrescribe={(a) => setShowPrescriptionModal({
                            patientId: a.patientId,
                            patientName: `${a.patientFirstName} ${a.patientLastName}`,
                            patientEmail: a.patientEmail,
                            patientPhone: a.patientPhone,
                            appointmentId: a.id,
                        })}
                    />
                )}
                {activeTab === "prescriptions" && (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Prescriptions</h1>
                                <p className="text-slate-500 mt-1">{prescriptions.length} prescriptions</p>
                            </div>
                            {/*<button*/}
                            {/*    onClick={() => setShowPrescriptionModal({ patientId: "", patientName: "", appointmentId: "" })}*/}
                            {/*    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-all flex items-center gap-2"*/}
                            {/*>*/}
                            {/*    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">*/}
                            {/*        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />*/}
                            {/*    </svg>*/}
                            {/*    New Prescription*/}
                            {/*</button>*/}


                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {prescriptions.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No prescriptions found</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Drug</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Dosage</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Duration</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Notes</th>
                                            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Created On</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                        {prescriptions.map((p, index) => {
                                            const drug = drugs.find(d => d.id === p.drugId);
                                            const appointment = allAppointments.find(a => a.id === p.appointmentId);
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{index + 1}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {appointment
                                                            ? `${appointment.patientFirstName} ${appointment.patientLastName}`
                                                            : `Appt #${p.appointmentId}`}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {drug ? `${drug.name} (${drug.milligrams})` : `Drug #${p.drugId || "—"}`}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{p.dossage}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{p.duration}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{p.notes || "—"}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {p.createdOn ? new Date(p.createdOn).toLocaleDateString() : "—"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {showPrescriptionModal && (
                    <PrescriptionModal
                        prefill={showPrescriptionModal}
                        doctorId={user.id}
                        drugs={drugs}
                        onClose={() => setShowPrescriptionModal(null)}
                        onCreated={handlePrescriptionCreated}
                    />
                )}
            </main>
        </div>
    );
}

function AllAppointmentsView({ appointments, statusColors, prescriptions, onPrescribe }) {
    const [filter, setFilter] = useState("all");
    const filtered = filter === "all" ? appointments : appointments.filter(a => a.appointmentStatus === filter);

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">All Appointments</h1>
                    <p className="text-slate-500 mt-1">{filtered.length} appointments</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {[
                        { key: "all", label: "All" },
                        { key: "PENDING", label: "Pending" },
                        { key: "WAITING", label: "Waiting" },
                        { key: "IN_CONSULTATION", label: "In Consultation" },
                        { key: "COMPLETED", label: "Completed" },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                filter === f.key ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No appointments found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Time</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Reason</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Prescription</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {filtered.map((a) => {
                                const formattedStatus = a.appointmentStatus
                                    ? String(a.appointmentStatus).replace("_", " ")
                                    : "UNKNOWN";
                                const existingPrescription = prescriptions.find(p => p.appointmentId === a.id);

                                return (
                                    <tr key={a.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm text-slate-800 font-medium whitespace-nowrap">
                                            {a.appointmentDateTime
                                                ? new Date(a.appointmentDateTime).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
                                                : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-800 whitespace-nowrap">
                                            {a.appointmentDateTime
                                                ? new Date(a.appointmentDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                                : "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-800">
                                                {a.patientFirstName || "—"} {a.patientLastName || ""}
                                            </p>
                                            <p className="text-xs text-slate-500">{a.patientPhone || "—"}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">
                                            {a.reason || "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[a.appointmentStatus] || "bg-slate-100 text-slate-700"}`}>
                                                    {formattedStatus}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {["PENDING", "WAITING", "IN_CONSULTATION", "COMPLETED"].includes(a.appointmentStatus) && (
                                                existingPrescription ? (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Prescribed
                                                        </span>
                                                ) : (
                                                    <button
                                                        onClick={() => onPrescribe(a)}
                                                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 transition-all"
                                                    >
                                                        Prescribe
                                                    </button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

function PrescriptionModal({ prefill, doctorId, drugs, onClose, onCreated }) {
    const [patients, setPatients] = useState([]);
    const [patientSearch, setPatientSearch] = useState(prefill.patientName || "");
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(
        prefill.patientId
            ? { id: prefill.patientId, name: prefill.patientName, email: prefill.patientEmail || "", phone: prefill.patientPhone || "" }
            : null
    );
    const [formData, setFormData] = useState({ drugId: "", dosage: "", duration: "", notes: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const r = await patientService.getAllPatients();
            if (r.success) setPatients(r.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (patientSearch.trim() && !selectedPatient) {
            setFilteredPatients(
                patients.filter(p =>
                    `${p.firstName} ${p.lastName} ${p.email} ${p.phoneNumber}`
                        .toLowerCase()
                        .includes(patientSearch.toLowerCase())
                )
            );
        } else {
            setFilteredPatients([]);
        }
    }, [patientSearch, patients, selectedPatient]);

    const handleSelectPatient = (p) => {
        setSelectedPatient({ id: p.id, name: `${p.firstName} ${p.lastName}`, phone: p.phoneNumber, email: p.email });
        setPatientSearch(`${p.firstName} ${p.lastName}`);
        setFilteredPatients([]);
    };

    const handleClearPatient = () => {
        setSelectedPatient(null);
        setPatientSearch("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPatient) { setError("Please select a patient"); return; }
        if (!formData.drugId) { setError("Please select a drug"); return; }
        if (!formData.dosage) { setError("Dosage is required"); return; }
        if (!formData.duration) { setError("Duration is required"); return; }
        if (!prefill.appointmentId) { setError("No appointment linked. Please prescribe from the All Appointments tab."); return; }

        setLoading(true);
        setError("");
        try {
            await prescriptionService.create({
                    appointmentId: prefill.appointmentId,
                drugId: Number(formData.drugId),
                dossage: Number(formData.dosage),
                duration: formData.duration,
                notes: formData.notes,
                doctorId: doctorId,
                createdOn: new Date().toISOString(),
            });
            onCreated();
        } catch (err) {
            console.error("Prescription error:", err);
            setError(err.response?.data?.message || err.response?.data?.title || "Failed to create prescription");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
                    <h2 className="text-lg font-bold text-slate-800">Create Prescription</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                    )}

                    {/* Patient Search */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Patient</label>
                        {selectedPatient ? (
                            <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg p-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{selectedPatient.name}</p>
                                    {selectedPatient.phone && (
                                        <p className="text-xs text-slate-500">{selectedPatient.email} | {selectedPatient.phone}</p>
                                    )}
                                </div>
                                <button type="button" onClick={handleClearPatient} className="text-sm text-red-600 hover:text-red-700 font-medium">
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    placeholder="Search patient by name..."
                                    className={inputClass}
                                />
                                {filteredPatients.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filteredPatients.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => handleSelectPatient(p)}
                                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                            >
                                                <p className="text-sm font-medium text-slate-800">{p.firstName} {p.lastName}</p>
                                                <p className="text-xs text-slate-500">{p.email} | {p.phoneNumber}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {patientSearch.trim() && filteredPatients.length === 0 && !selectedPatient && (
                                    <p className="text-xs text-slate-400 mt-1">No patients found</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Drug Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Drug / Medication</label>
                        <select
                            value={formData.drugId}
                            onChange={(e) => setFormData({ ...formData, drugId: e.target.value })}
                            required
                            className={inputClass}
                        >
                            <option value="">-- Select a Drug --</option>
                            {drugs.map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.milligrams})</option>
                            ))}
                        </select>
                        {drugs.length === 0 && <p className="text-xs text-slate-400 mt-1">Loading drugs...</p>}
                    </div>

                    {/* Dosage */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Dosage</label>
                        <input
                            type="number"
                            value={formData.dosage}
                            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                            required
                            placeholder="e.g. 2 (tablets/capsules)"
                            className={inputClass}
                        />
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration</label>
                        <input
                            type="text"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            required
                            placeholder="e.g. 3 times a day for 7 days"
                            className={inputClass}
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400">(optional)</span></label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            placeholder="e.g. Take after meals, avoid alcohol..."
                            className={inputClass + " resize-none"}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Creating...
                            </>
                        ) : (
                            "Create Prescription"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}