import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import patientService from "../api/patientService";
import appointmentService from "../api/appointmentService";
import receptionistService from "../api/receptionistService";
import billService from "../api/billService";

export default function ReceptionistDashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [patients, setPatients] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [todayAppointments, setTodayAppointments] = useState([]);
    const [success, setSuccess] = useState("");
    const [credentialsModal, setCredentialsModal] = useState(null);

    useEffect(() => { fetchTodayAppointments(); }, []);
    useEffect(() => { if (activeTab === "patients") fetchPatients(); }, [activeTab]);

    const fetchPatients = async () => {
        setLoadingPatients(true);
        try {
            const response = await patientService.getAllPatients();
            if (response.success) setPatients(response.data);
        } catch (err) { console.error(err); }
        finally { setLoadingPatients(false); }
    };

    const fetchTodayAppointments = async () => {
        try {
            const response = await appointmentService.getToday();
            if (response.success) setTodayAppointments(response.data.filter(a => a.appointmentStatus));
        } catch (err) { console.error(err); }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) { setSearchResults(null); return; }
        try {
            const response = await patientService.searchPatients(searchQuery);
            if (response.success) setSearchResults(response.data);
        } catch (err) { console.error(err); }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const response = await appointmentService.updateStatus(id, status);
            if (response.success) {
                setTodayAppointments(prev => prev.map(a => a.id === id ? response.data : a));
                showAlert("Appointment status updated");
            }
        } catch (err) { console.error(err); }
    };

    const showAlert = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 4000); };

    const statusCounts = {
        waiting: todayAppointments.filter(a => a.appointmentStatus === "WAITING").length,
        inConsultation: todayAppointments.filter(a => a.appointmentStatus === "IN_CONSULTATION").length,
        completed: todayAppointments.filter(a => a.appointmentStatus === "COMPLETED").length,
        total: todayAppointments.length,
    };

    const tabs = [
        { key: "dashboard", label: "Dashboard" },
        { key: "register", label: "Register Patient" },
        { key: "patients", label: "Patient List" },
        { key: "book", label: "Book Appointment" },
        { key: "appointments", label: "Appointments" },
        { key: "billing", label: "Billing" },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex gap-1 mb-8 bg-white rounded-lg border border-slate-200 p-1 w-fit flex-wrap">
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {success && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{success}</div>
                )}

                {activeTab === "dashboard" && (
                    <>
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">Receptionist Dashboard</h1>
                            <p className="text-slate-500 mt-1">Manage patients and appointments</p>
                        </div>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                            {[
                                { title: "Register Patient", icon: "📝", color: "border-amber-100 bg-amber-50 hover:border-amber-300", onClick: () => setActiveTab("register") },
                                { title: "Search Patient", icon: "🔍", color: "border-teal-100 bg-teal-50 hover:border-teal-300", onClick: () => setActiveTab("patients") },
                                { title: "Book Appointment", icon: "📅", color: "border-blue-100 bg-blue-50 hover:border-blue-300", onClick: () => setActiveTab("book") },
                            ].map((a, i) => (
                                <div key={i} onClick={a.onClick} className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${a.color}`}>
                                    <span className="text-3xl">{a.icon}</span>
                                    <h3 className="text-lg font-semibold text-slate-800 mt-3">{a.title}</h3>
                                </div>
                            ))}
                        </div>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Today's Overview</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Total Appointments", value: statusCounts.total, icon: "📅" },
                                { label: "Waiting", value: statusCounts.waiting, icon: "🪑" },
                                { label: "In Consultation", value: statusCounts.inConsultation, icon: "🩺" },
                                { label: "Completed", value: statusCounts.completed, icon: "✅" },
                            ].map((s, i) => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-slate-500">{s.label}</p><span>{s.icon}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === "register" && (
                    <RegisterPatientForm onSuccess={(patient) => {
                        setCredentialsModal(patient);
                        showAlert(`Patient ${patient.firstName} ${patient.lastName} registered successfully`);
                    }} />
                )}

                {activeTab === "patients" && (
                    <>
                        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800">Patient Records</h1></div>
                        <form onSubmit={handleSearch} className="mb-6 flex gap-3">
                            <input type="text" value={searchQuery}
                                   onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value.trim()) setSearchResults(null); }}
                                   placeholder="Search by name, email, or phone..."
                                   className="flex-1 px-4 py-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                            <button type="submit" className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm">Search</button>
                            {searchResults && <button type="button" onClick={() => { setSearchResults(null); setSearchQuery(""); }}
                                                      className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg text-sm">Clear</button>}
                        </form>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {loadingPatients ? (
                                <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto" /></div>
                            ) : <PatientTable patients={searchResults !== null ? searchResults : patients} />}
                        </div>
                    </>
                )}

                {activeTab === "book" && (
                    <BookAppointmentForm onSuccess={() => { showAlert("Appointment booked successfully"); fetchTodayAppointments(); }} />
                )}

                {activeTab === "appointments" && (
                    <AppointmentsView onStatusUpdate={handleStatusUpdate} />
                )}

                {credentialsModal && <CredentialsModal patient={credentialsModal} onClose={() => setCredentialsModal(null)} />}

                {activeTab === "billing" && (
                    <BillingView onAlert={showAlert} />
                )}

            </main>
        </div>
    );
}

function AppointmentsView({ onStatusUpdate }) {
    const [filter, setFilter] = useState("today");
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchAppointments(); }, [filter]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const response = filter === "today" ? await appointmentService.getToday() : await appointmentService.getAll();
            if (response.success) setAppointments(response.data.filter(a => a.appointmentStatus));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
                    <p className="text-slate-500 mt-1">{appointments.length} appointments</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setFilter("today")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "today" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>Today</button>
                    <button onClick={() => setFilter("all")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === "all" ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>All</button>
                </div>
            </div>
            {loading ? (
                <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto" /></div>
            ) : (
                <AppointmentTable appointments={appointments} onStatusUpdate={onStatusUpdate} />
            )}
        </>
    );
}

function BookAppointmentForm({ onSuccess }) {
    const [formData, setFormData] = useState({ patientId: "", doctorId: "", appointmentDateTime: "", reason: "" });
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [patientSearch, setPatientSearch] = useState("");
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [pRes, dRes] = await Promise.all([patientService.getAllPatients(), receptionistService.getDoctors()]);
            if (pRes.success) setPatients(pRes.data);
            if (dRes.success) setDoctors(dRes.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (patientSearch.trim()) {
            setFilteredPatients(patients.filter(p =>
                `${p.firstName} ${p.lastName} ${p.email} ${p.phoneNumber}`.toLowerCase().includes(patientSearch.toLowerCase())
            ));
        } else { setFilteredPatients([]); }
    }, [patientSearch, patients]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.patientId) { setError("Please select a patient"); return; }
        if (!formData.doctorId) { setError("Please select a doctor"); return; }
        if (!formData.appointmentDateTime) { setError("Please select a date and time"); return; }
        setLoading(true); setError("");
        try {
            let dateTime = formData.appointmentDateTime;
            if (dateTime && dateTime.split(":").length === 2) dateTime = dateTime + ":00";
            const response = await appointmentService.book({
                patientId: Number(formData.patientId), doctorId: Number(formData.doctorId),
                appointmentDateTime: dateTime, reason: formData.reason,
            });
            if (response.success) { onSuccess(); setFormData({ patientId: "", doctorId: "", appointmentDateTime: "", reason: "" }); setPatientSearch(""); }
            else { setError(response.message); }
        } catch (err) { console.error("Booking error:", err); setError(err.response?.data?.message || "Failed to book appointment"); }
        finally { setLoading(false); }
    };

    const selectedPatient = patients.find(p => p.id === Number(formData.patientId));
    const inputClass = "w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Book Appointment</h1>
                <p className="text-slate-500 mt-1">Schedule a new appointment for a patient</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Select Patient</h3>
                        {selectedPatient ? (
                            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg p-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                                    <p className="text-xs text-slate-500">{selectedPatient.email} | {selectedPatient.phoneNumber}</p>
                                </div>
                                <button type="button" onClick={() => { setFormData({ ...formData, patientId: "" }); setPatientSearch(""); }}
                                        className="text-sm text-red-600 hover:text-red-700 font-medium">Change</button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
                                       placeholder="Search patient by name, email, or phone..." className={inputClass} />
                                {filteredPatients.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filteredPatients.map(p => (
                                            <div key={p.id} onClick={() => { setFormData({ ...formData, patientId: String(p.id) }); setPatientSearch(""); setFilteredPatients([]); }}
                                                 className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                                                <p className="text-sm font-medium text-slate-800">{p.firstName} {p.lastName}</p>
                                                <p className="text-xs text-slate-500">{p.email} | {p.phoneNumber}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Select Doctor</h3>
                        <select name="doctorId" value={formData.doctorId} onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })} required className={inputClass}>
                            <option value="">-- Select a Doctor --</option>
                            {doctors.map(d => (<option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>))}
                        </select>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Date & Time</h3>
                        <input type="datetime-local" name="appointmentDateTime" value={formData.appointmentDateTime}
                               onChange={(e) => setFormData({ ...formData, appointmentDateTime: e.target.value })} required className={inputClass} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Reason for Visit</h3>
                        <textarea name="reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                  rows={3} placeholder="e.g. General checkup, follow-up, headache..." className={inputClass + " resize-none"} />
                    </div>
                    <button type="submit" disabled={loading}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2">
                        {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Booking...</> : "Book Appointment"}
                    </button>
                </form>
            </div>
        </>
    );
}


function AppointmentTable({ appointments, onStatusUpdate }) {
    // Map status to color
    const statusColors = {
        PENDING: "bg-slate-100 text-slate-700",
        WAITING: "bg-amber-100 text-amber-700",
        IN_CONSULTATION: "bg-blue-100 text-blue-700",
        COMPLETED: "bg-emerald-100 text-emerald-700",
        CANCELLED: "bg-red-100 text-red-700",
        NO_SHOW: "bg-gray-100 text-gray-700",
    };

    // Map possible actions for each status
    const statusActions = {
        PENDING: [{ label: "Check In", next: "WAITING" }, { label: "Cancel", next: "CANCELLED" }],
        WAITING: [{ label: "Start Consultation", next: "IN_CONSULTATION" }, { label: "No Show", next: "NO_SHOW" }],
        IN_CONSULTATION: [{ label: "Complete", next: "COMPLETED" }],
    };

    if (!appointments || appointments.length === 0) {
        return <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">No appointments found</div>;
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Time</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Doctor</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Reason</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {appointments.map(a => {
                        // Normalize status to uppercase for consistency
                        const normalizedStatus = a.appointmentStatus ? a.appointmentStatus.toUpperCase() : "UNKNOWN";
                        return (
                            <tr key={a.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-800 font-medium whitespace-nowrap">
                                    {a.appointmentDateTime
                                        ? new Date(a.appointmentDateTime).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })
                                        : "—"}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-800 font-medium whitespace-nowrap">
                                    {a.appointmentDateTime
                                        ? new Date(a.appointmentDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                        : "—"}
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-medium text-slate-800">{a.patientFirstName} {a.patientLastName}</p>
                                    <p className="text-xs text-slate-500">{a.patientPhone}</p>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">Dr. {a.doctorFirstName} {a.doctorLastName}</td>
                                <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">{a.reason || "—"}</td>
                                <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[normalizedStatus] || "bg-slate-100 text-slate-700"}`}>
                                            {normalizedStatus.replace("_", " ")}
                                        </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        {(statusActions[normalizedStatus] || []).map((action, i) => (
                                            <button key={i} onClick={() => onStatusUpdate(a.id, action.next)}
                                                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all">
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


function BillingView({ onAlert }) {
    const [bills, setBills] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [showAddItem, setShowAddItem] = useState(null);
    const [showPayment, setShowPayment] = useState(null);

    useEffect(() => { fetchBills(); }, [filter]);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const res = filter === "all"
                ? await billService.getAll()
                : await billService.getByStatus(filter);
            if (res.success) setBills(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleAddItem = async (billId, data) => {
        try {
            const res = await billService.addItem(billId, data);
            if (res.success) {
                onAlert("Charge added successfully");
                fetchBills();
                setShowAddItem(null);
            }
        } catch (err) { console.error(err); }
    };

    const handlePayment = async (billId, data) => {
        try {
            const res = await billService.recordPayment(billId, data);
            if (res.success) {
                onAlert("Payment recorded successfully");
                fetchBills();
                setShowPayment(null);
            }
        } catch (err) { console.error(err); }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
                    <p className="text-slate-500 mt-1">{bills.length} bills</p>
                </div>
                <div className="flex gap-2">
                    {[
                        { key: "all", label: "All" },
                        { key: "PENDING", label: "Pending" },
                        { key: "PAID", label: "Paid" },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    filter === f.key ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600"
                                }`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto" />
                </div>
            ) : bills.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                    No bills found. Bills are auto-generated when doctors create prescriptions.
                </div>
            ) : (
                <div className="space-y-4">
                    {bills.map(bill => (
                        <div key={bill.id} className="bg-white rounded-xl border border-slate-200 p-5">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-base font-semibold text-slate-800">
                                        {bill.patientFirstName} {bill.patientLastName}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {bill.patientPhone} | Bill #{bill.id}
                                        {bill.appointmentId && ` | Appointment #${bill.appointmentId}`}
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

                            {/* Line Items */}
                            {bill.items && bill.items.length > 0 && (
                                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                        <tr className="text-slate-500 text-xs uppercase">
                                            <th className="text-left pb-2">Item</th>
                                            <th className="text-center pb-2">Qty</th>
                                            <th className="text-right pb-2">Unit Price</th>
                                            <th className="text-right pb-2">Total</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                        {bill.items.map((item, i) => (
                                            <tr key={i}>
                                                <td className="py-2 text-slate-700">{item.description}</td>
                                                <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                                                <td className="py-2 text-right text-slate-600">KES {item.unitPrice?.toFixed(2)}</td>
                                                <td className="py-2 text-right font-medium text-slate-800">KES {item.totalPrice?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Total */}
                            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                                <span className="text-sm font-semibold text-slate-800">Total Amount</span>
                                <span className="text-lg font-bold text-slate-800">KES {bill.totalAmount?.toFixed(2)}</span>
                            </div>

                            {/* Payment info if paid */}
                            {bill.paymentStatus === "PAID" && (
                                <div className="mt-3 bg-emerald-50 rounded-lg p-3 text-sm text-emerald-700">
                                    Paid via {bill.paymentMethod}
                                    {bill.paymentReference && ` — Ref: ${bill.paymentReference}`}
                                    {bill.paidAt && ` — ${new Date(bill.paidAt).toLocaleDateString()}`}
                                </div>
                            )}

                            {/* Actions for pending bills */}
                            {bill.paymentStatus === "PENDING" && (
                                <div className="mt-4 flex gap-3">
                                    <button onClick={() => setShowAddItem(bill)}
                                            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg transition-all">
                                        + Add Charge
                                    </button>
                                    <button onClick={() => setShowPayment(bill)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all">
                                        Record Payment
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Charge Modal */}
            {showAddItem && (
                <AddChargeModal
                    bill={showAddItem}
                    onClose={() => setShowAddItem(null)}
                    onSubmit={(data) => handleAddItem(showAddItem.id, data)}
                />
            )}

            {/* Record Payment Modal */}
            {showPayment && (
                <PaymentModal
                    bill={showPayment}
                    onClose={() => setShowPayment(null)}
                    onSubmit={(data) => handlePayment(showPayment.id, data)}
                />
            )}
        </>
    );
}

function AddChargeModal({ bill, onClose, onSubmit }) {
    const [formData, setFormData] = useState({ description: "", quantity: 1, unitPrice: "" });
    const [loading, setLoading] = useState(false);

    const presets = [
        { label: "Consultation Fee", price: 500 },
        { label: "Lab Test - Blood", price: 1500 },
        { label: "Lab Test - Urine", price: 800 },
        { label: "Lab Test - X-Ray", price: 3000 },
        { label: "Injection Fee", price: 200 },
        { label: "Dressing/Wound Care", price: 300 },
    ];

    const handlePreset = (preset) => {
        setFormData({ description: preset.label, quantity: 1, unitPrice: preset.price });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.description || !formData.unitPrice) return;
        setLoading(true);
        await onSubmit({
            description: formData.description,
            quantity: Number(formData.quantity),
            unitPrice: Number(formData.unitPrice),
        });
        setLoading(false);
    };

    const inputClass = "w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Add Charge</h2>
                        <p className="text-sm text-slate-500">{bill.patientFirstName} {bill.patientLastName} — Bill #{bill.id}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {/* Quick presets */}
                    <p className="text-sm font-medium text-slate-700 mb-2">Quick Add</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {presets.map((p, i) => (
                            <button key={i} type="button" onClick={() => handlePreset(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        formData.description === p.label
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    }`}>
                                {p.label} (KES {p.price})
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description *</label>
                            <input type="text" value={formData.description}
                                   onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                   required placeholder="e.g. Consultation Fee" className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
                                <input type="number" min="1" value={formData.quantity}
                                       onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                       required className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Price (KES) *</label>
                                <input type="number" min="0" step="0.01" value={formData.unitPrice}
                                       onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                       required placeholder="500" className={inputClass} />
                            </div>
                        </div>

                        {formData.unitPrice && formData.quantity && (
                            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                                Total: <span className="font-bold">KES {(Number(formData.unitPrice) * Number(formData.quantity)).toFixed(2)}</span>
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Adding...</> : "Add Charge"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function PaymentModal({ bill, onClose, onSubmit }) {
    const [formData, setFormData] = useState({ paymentMethod: "", paymentReference: "" });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.paymentMethod) return;
        if (formData.paymentMethod === "MPESA" && !formData.paymentReference.trim()) return;
        setLoading(true);
        await onSubmit(formData);
        setLoading(false);
    };

    const inputClass = "w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Record Payment</h2>
                        <p className="text-sm text-slate-500">{bill.patientFirstName} {bill.patientLastName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-slate-50 rounded-lg p-4 mb-6 text-center">
                        <p className="text-sm text-slate-500">Amount Due</p>
                        <p className="text-3xl font-bold text-slate-800">KES {bill.totalAmount?.toFixed(2)}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method *</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { key: "CASH", label: "Cash", icon: "💵" },
                                    { key: "MPESA", label: "M-Pesa", icon: "📱" },
                                    { key: "CARD", label: "Card", icon: "💳" },
                                ].map(m => (
                                    <button key={m.key} type="button"
                                            onClick={() => setFormData({ ...formData, paymentMethod: m.key })}
                                            className={`p-3 rounded-lg border-2 text-center transition-all ${
                                                formData.paymentMethod === m.key
                                                    ? "border-emerald-500 bg-emerald-50"
                                                    : "border-slate-200 hover:border-slate-300"
                                            }`}>
                                        <span className="text-2xl">{m.icon}</span>
                                        <p className="text-xs font-medium text-slate-700 mt-1">{m.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {formData.paymentMethod === "MPESA" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">M-Pesa Transaction Code *</label>
                                <input type="text" value={formData.paymentReference}
                                       onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value.toUpperCase() })}
                                       required placeholder="e.g. SHK7Y2M4XR" className={inputClass} />
                            </div>
                        )}

                        {formData.paymentMethod === "CARD" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Card Reference (optional)</label>
                                <input type="text" value={formData.paymentReference}
                                       onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                                       placeholder="e.g. last 4 digits or approval code" className={inputClass} />
                            </div>
                        )}

                        <button type="submit" disabled={loading || !formData.paymentMethod}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Processing...</> : `Pay KES ${bill.totalAmount?.toFixed(2)}`}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}


function RegisterPatientForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        firstName: "", lastName: "", email: "", phoneNumber: "",
        dateOfBirth: "", gender: "MALE", address: "",
        emergencyContactName: "", emergencyContactPhone: "", allergies: "",
    });
    const [appointmentData, setAppointmentData] = useState({
        doctorId: "", appointmentDateTime: "", reason: "",
    });
    const [doctors, setDoctors] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadDoctors = async () => {
            try {
                const res = await receptionistService.getDoctors();
                if (res.success) setDoctors(res.data);
            } catch (err) { console.error(err); }
        };
        loadDoctors();
    }, []);

    const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); if (error) setError(""); };
    const handleAppointmentChange = (e) => { setAppointmentData({ ...appointmentData, [e.target.name]: e.target.value }); if (error) setError(""); };

    const inputClass = "w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!appointmentData.doctorId) { setError("Please assign a doctor"); return; }
        if (!appointmentData.appointmentDateTime) { setError("Please select an appointment date & time"); return; }

        setLoading(true); setError("");
        try {
            // Step 1: Register patient
            const patientRes = await patientService.registerPatient(formData);
            if (!patientRes.success) { setError(patientRes.message); setLoading(false); return; }

            const patient = patientRes.data;

            // Step 2: Book appointment with the newly created patient
            let dateTime = appointmentData.appointmentDateTime;
            if (dateTime && dateTime.split(":").length === 2) dateTime = dateTime + ":00";

            const appointmentRes = await appointmentService.book({
                patientId: patient.id,
                doctorId: Number(appointmentData.doctorId),
                appointmentDateTime: dateTime,
                reason: appointmentData.reason,
            });

            if (!appointmentRes.success) {
                // Patient was created but appointment failed — still show credentials
                setError("Patient registered but appointment booking failed: " + appointmentRes.message);
            }

            onSuccess(patient);
            setFormData({ firstName: "", lastName: "", email: "", phoneNumber: "", dateOfBirth: "", gender: "MALE", address: "", emergencyContactName: "", emergencyContactPhone: "", allergies: "" });
            setAppointmentData({ doctorId: "", appointmentDateTime: "", reason: "" });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to register patient");
        } finally { setLoading(false); }
    };

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Register New Patient</h1>
                <p className="text-slate-500 mt-1">Register patient, assign a doctor, and book their first appointment.</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label><input name="firstName" required value={formData.firstName} onChange={handleChange} className={inputClass} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label><input name="lastName" required value={formData.lastName} onChange={handleChange} className={inputClass} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label><input name="email" type="email" required value={formData.email} onChange={handleChange} className={inputClass} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label><input name="phoneNumber" type="tel" required value={formData.phoneNumber} onChange={handleChange} placeholder="0712345678" className={inputClass} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth *</label><input name="dateOfBirth" type="date" required value={formData.dateOfBirth} onChange={handleChange} className={inputClass} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Gender *</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                                    <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Address *</label><input name="address" required value={formData.address} onChange={handleChange} placeholder="e.g. Westlands, Nairobi" className={inputClass} /></div>

                    {/* Emergency Contact */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Name</label><input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className={inputClass} /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Phone</label><input name="emergencyContactPhone" type="tel" value={formData.emergencyContactPhone} onChange={handleChange} className={inputClass} /></div>
                        </div>
                    </div>

                    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Known Allergies</label>
                        <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows={3} placeholder="e.g. Penicillin, Peanuts..." className={inputClass + " resize-none"} /></div>

                    {/* Assign Doctor & Appointment */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Assign Doctor & Appointment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Doctor *</label>
                                <select name="doctorId" value={appointmentData.doctorId} onChange={handleAppointmentChange} required className={inputClass}>
                                    <option value="">-- Select a Doctor --</option>
                                    {doctors.map(d => (<option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Appointment Date & Time *</label>
                                <input type="datetime-local" name="appointmentDateTime" value={appointmentData.appointmentDateTime} onChange={handleAppointmentChange} required className={inputClass} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason for Visit</label>
                            <textarea name="reason" value={appointmentData.reason} onChange={handleAppointmentChange}
                                      rows={3} placeholder="e.g. General checkup, follow-up, headache..." className={inputClass + " resize-none"} />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-2.5 rounded-lg disabled:opacity-50 flex items-center gap-2">
                            {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Registering...</> : "Register & Book Appointment"}
                        </button>
                        <button type="reset" onClick={() => {
                            setFormData({ firstName: "", lastName: "", email: "", phoneNumber: "", dateOfBirth: "", gender: "MALE", address: "", emergencyContactName: "", emergencyContactPhone: "", allergies: "" });
                            setAppointmentData({ doctorId: "", appointmentDateTime: "", reason: "" });
                        }} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">Clear</button>
                    </div>
                </form>
            </div>
        </>
    );
}

function PatientTable({ patients }) {
    if (patients.length === 0) return <div className="p-8 text-center text-slate-500">No patients found</div>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Patient</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Gender</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">DOB</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Address</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {patients.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4"><p className="text-sm font-medium text-slate-800">{p.firstName} {p.lastName}</p><p className="text-xs text-slate-500">{p.email}</p></td>
                        <td className="px-6 py-4 text-sm text-slate-600">{p.phoneNumber}</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{p.gender}</span></td>
                        <td className="px-6 py-4 text-sm text-slate-600">{p.dateOfBirth}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{p.address}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

function CredentialsModal({ patient, onClose }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(`MediCare HMS Login\nName: ${patient.firstName} ${patient.lastName}\nEmail: ${patient.email}\nUsername: ${patient.username}\nPassword: ${patient.generatedPassword}\nLogin: http://localhost:3000/login`);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div><h2 className="text-lg font-bold text-slate-800">Patient Registered!</h2><p className="text-sm text-slate-500">Save these credentials</p></div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                        <div className="flex justify-between"><span className="text-sm text-slate-500">Name</span><span className="text-sm font-medium text-slate-800">{patient.firstName} {patient.lastName}</span></div>
                        <div className="flex justify-between"><span className="text-sm text-slate-500">Email</span><span className="text-sm font-medium text-slate-800">{patient.email}</span></div>
                        <div className="flex justify-between"><span className="text-sm text-slate-500">Username</span><span className="text-sm font-medium text-slate-800">{patient.username}</span></div>
                        <div className="border-t border-slate-200 pt-3 flex justify-between"><span className="text-sm text-slate-500">Password</span><span className="text-sm font-bold text-teal-700 font-mono tracking-wider">{patient.generatedPassword}</span></div>
                    </div>
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-xs text-amber-700">This password will not be shown again.</p></div>
                    <div className="mt-6 flex gap-3">
                        <button onClick={handleCopy} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2">{copied ? "Copied!" : "Copy Credentials"}</button>
                        <button onClick={onClose} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}