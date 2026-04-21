import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import patientService from "../api/patientService";
import appointmentService from "../api/appointmentService";
import receptionistService from "../api/receptionistService";

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

// function RegisterPatientForm({ onSuccess }) {
//     const [formData, setFormData] = useState({
//         firstName: "", lastName: "", email: "", phoneNumber: "",
//         dateOfBirth: "", gender: "MALE", address: "",
//         emergencyContactName: "", emergencyContactPhone: "", allergies: "",
//     });
//     const [error, setError] = useState("");
//     const [loading, setLoading] = useState(false);
//     const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); if (error) setError(""); };
//     const inputClass = "w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";
//
//     const handleSubmit = async (e) => {
//         e.preventDefault(); setLoading(true); setError("");
//         try {
//             const response = await patientService.registerPatient(formData);
//             if (response.success) {
//                 onSuccess(response.data);
//                 setFormData({ firstName: "", lastName: "", email: "", phoneNumber: "", dateOfBirth: "", gender: "MALE", address: "", emergencyContactName: "", emergencyContactPhone: "", allergies: "" });
//             } else { setError(response.message); }
//         } catch (err) { setError(err.response?.data?.message || "Failed to register patient"); }
//         finally { setLoading(false); }
//     };
//
//     return (
//         <>
//             <div className="mb-6">
//                 <h1 className="text-2xl font-bold text-slate-800">Register New Patient</h1>
//                 <p className="text-slate-500 mt-1">A login password will be auto-generated.</p>
//             </div>
//             <div className="bg-white rounded-xl border border-slate-200 p-6">
//                 {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
//                 <form onSubmit={handleSubmit} className="space-y-6">
//                     <div>
//                         <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Personal Information</h3>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             <div><label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label><input name="firstName" required value={formData.firstName} onChange={handleChange} className={inputClass} /></div>
//                             <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label><input name="lastName" required value={formData.lastName} onChange={handleChange} className={inputClass} /></div>
//                             <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label><input name="email" type="email" required value={formData.email} onChange={handleChange} className={inputClass} /></div>
//                             <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label><input name="phoneNumber" type="tel" required value={formData.phoneNumber} onChange={handleChange} placeholder="0712345678" className={inputClass} /></div>
//                             <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth *</label><input name="dateOfBirth" type="date" required value={formData.dateOfBirth} onChange={handleChange} className={inputClass} /></div>
//                             <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Gender *</label>
//                                 <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
//                                     <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
//                                 </select>
//                             </div>
//                         </div>
//                     </div>
//                     <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Address *</label><input name="address" required value={formData.address} onChange={handleChange} placeholder="e.g. Westlands, Nairobi" className={inputClass} /></div>
//                     <div>
//                         <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Emergency Contact</h3>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                             <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Name</label><input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} className={inputClass} /></div>
//                             <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Phone</label><input name="emergencyContactPhone" type="tel" value={formData.emergencyContactPhone} onChange={handleChange} className={inputClass} /></div>
//                         </div>
//                     </div>
//                     <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Known Allergies</label>
//                         <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows={3} placeholder="e.g. Penicillin, Peanuts..." className={inputClass + " resize-none"} /></div>
//                     <div className="flex gap-3">
//                         <button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-2.5 rounded-lg disabled:opacity-50 flex items-center gap-2">
//                             {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Registering...</> : "Register Patient"}
//                         </button>
//                         <button type="reset" onClick={() => setFormData({ firstName: "", lastName: "", email: "", phoneNumber: "", dateOfBirth: "", gender: "MALE", address: "", emergencyContactName: "", emergencyContactPhone: "", allergies: "" })}
//                                 className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">Clear</button>
//                     </div>
//                 </form>
//             </div>
//         </>
//     );
// }

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