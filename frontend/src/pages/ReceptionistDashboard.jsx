import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import patientService from "../api/patientService";

export default function ReceptionistDashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [patients, setPatients] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [success, setSuccess] = useState("");
    const [credentialsModal, setCredentialsModal] = useState(null);

    useEffect(() => {
        if (activeTab === "patients") {
            fetchPatients();
        }
    }, [activeTab]);

    const fetchPatients = async () => {
        setLoadingPatients(true);
        try {
            const response = await patientService.getAllPatients();
            if (response.success) setPatients(response.data);
        } catch (err) {
            console.error("Failed to load patients", err);
        } finally {
            setLoadingPatients(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults(null);
            return;
        }
        try {
            const response = await patientService.searchPatients(searchQuery);
            if (response.success) setSearchResults(response.data);
        } catch (err) {
            console.error("Search failed", err);
        }
    };

    const showAlert = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(""), 4000);
    };

    const quickActions = [
        {
            title: "Register Patient",
            description: "Register a new patient in the system",
            icon: "📝",
            color: "border-amber-100 bg-amber-50 hover:border-amber-300",
            onClick: () => setActiveTab("register"),
        },
        {
            title: "Search Patient",
            description: "Find and view patient records",
            icon: "🔍",
            color: "border-teal-100 bg-teal-50 hover:border-teal-300",
            onClick: () => setActiveTab("patients"),
        },
        {
            title: "Book Appointment",
            description: "Schedule a new appointment",
            icon: "📅",
            color: "border-blue-100 bg-blue-50 hover:border-blue-300",
            onClick: () => {},
            disabled: true,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Tab Navigation */}
                <div className="flex gap-1 mb-8 bg-white rounded-lg border border-slate-200 p-1 w-fit">
                    {[
                        { key: "dashboard", label: "Dashboard" },
                        { key: "register", label: "Register Patient" },
                        { key: "patients", label: "Patient List" },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                activeTab === tab.key
                                    ? "bg-teal-600 text-white"
                                    : "text-slate-600 hover:bg-slate-50"
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

                {/* Dashboard Tab */}
                {activeTab === "dashboard" && (
                    <>
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">Receptionist Dashboard</h1>
                            <p className="text-slate-500 mt-1">Manage patients and appointments</p>
                        </div>

                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                            {quickActions.map((action, i) => (
                                <div
                                    key={i}
                                    onClick={action.disabled ? undefined : action.onClick}
                                    className={`p-6 rounded-xl border-2 transition-all duration-200 ${action.color} ${
                                        action.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-md"
                                    }`}
                                >
                                    <span className="text-3xl">{action.icon}</span>
                                    <h3 className="text-lg font-semibold text-slate-800 mt-3">{action.title}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{action.description}</p>
                                    {action.disabled && (
                                        <span className="inline-block mt-3 px-2 py-0.5 bg-slate-200 text-slate-500 text-xs rounded-full">
                      Coming Soon
                    </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Today's Overview</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Patients Registered", value: "—", icon: "🧑" },
                                { label: "Appointments Today", value: "—", icon: "📅" },
                                { label: "Waiting Room", value: "—", icon: "🪑" },
                                { label: "Completed", value: "—", icon: "✅" },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-slate-500">{stat.label}</p>
                                        <span>{stat.icon}</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Register Patient Tab */}
                {activeTab === "register" && (
                    <RegisterPatientForm
                        onSuccess={(patient) => {
                            setCredentialsModal(patient);
                            showAlert(`Patient ${patient.firstName} ${patient.lastName} registered successfully`);
                        }}
                    />
                )}

                {/* Patient List Tab */}
                {activeTab === "patients" && (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-800">Patient Records</h1>
                            <p className="text-slate-500 mt-1">Search and view all registered patients</p>
                        </div>

                        <form onSubmit={handleSearch} className="mb-6 flex gap-3">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (!e.target.value.trim()) setSearchResults(null);
                                }}
                                placeholder="Search by name, email, or phone..."
                                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                            <button type="submit" className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-all text-sm">
                                Search
                            </button>
                            {searchResults && (
                                <button type="button" onClick={() => { setSearchResults(null); setSearchQuery(""); }}
                                        className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-all text-sm">
                                    Clear
                                </button>
                            )}
                        </form>

                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {loadingPatients ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto" />
                                </div>
                            ) : (
                                <PatientTable patients={searchResults !== null ? searchResults : patients} />
                            )}
                        </div>
                    </>
                )}

                {/* Credentials Modal */}
                {credentialsModal && (
                    <CredentialsModal patient={credentialsModal} onClose={() => setCredentialsModal(null)} />
                )}
            </main>
        </div>
    );
}

function RegisterPatientForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        firstName: "", lastName: "", email: "", phoneNumber: "",
        dateOfBirth: "", gender: "MALE", address: "",
        emergencyContactName: "", emergencyContactPhone: "", allergies: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const response = await patientService.registerPatient(formData);
            if (response.success) {
                onSuccess(response.data);
                setFormData({
                    firstName: "", lastName: "", email: "", phoneNumber: "",
                    dateOfBirth: "", gender: "MALE", address: "",
                    emergencyContactName: "", emergencyContactPhone: "", allergies: "",
                });
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to register patient");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent";

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Register New Patient</h1>
                <p className="text-slate-500 mt-1">Fill in the patient's details. A login password will be auto-generated.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name *</label>
                                <input name="firstName" type="text" required value={formData.firstName} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name *</label>
                                <input name="lastName" type="text" required value={formData.lastName} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                                <input name="email" type="email" required value={formData.email} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number *</label>
                                <input name="phoneNumber" type="tel" required value={formData.phoneNumber} onChange={handleChange} placeholder="0712345678" className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth *</label>
                                <input name="dateOfBirth" type="date" required value={formData.dateOfBirth} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender *</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Address</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address *</label>
                            <input name="address" type="text" required value={formData.address} onChange={handleChange} placeholder="e.g. Westlands, Nairobi" className={inputClass} />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Name</label>
                                <input name="emergencyContactName" type="text" value={formData.emergencyContactName} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Phone</label>
                                <input name="emergencyContactPhone" type="tel" value={formData.emergencyContactPhone} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Medical Information</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Known Allergies</label>
                            <textarea name="allergies" value={formData.allergies} onChange={handleChange} rows={3}
                                      placeholder="List any known allergies (e.g. Penicillin, Peanuts)..." className={inputClass + " resize-none"} />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={loading}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2">
                            {loading ? (
                                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Registering...</>
                            ) : "Register Patient"}
                        </button>
                        <button type="reset"
                                onClick={() => setFormData({ firstName: "", lastName: "", email: "", phoneNumber: "", dateOfBirth: "", gender: "MALE", address: "", emergencyContactName: "", emergencyContactPhone: "", allergies: "" })}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-all">
                            Clear Form
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

function PatientTable({ patients }) {
    if (patients.length === 0) {
        return <div className="p-8 text-center text-slate-500">No patients found</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">DOB</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-800">{p.firstName} {p.lastName}</p>
                            <p className="text-xs text-slate-500">{p.email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{p.phoneNumber}</td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{p.gender}</span>
                        </td>
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
        const text = `MediCare HMS Login Credentials\n\nName: ${patient.firstName} ${patient.lastName}\nEmail: ${patient.email}\nUsername: ${patient.username}\nPassword: ${patient.generatedPassword}\n\nLogin at: http://localhost:3000/login`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Patient Registered!</h2>
                            <p className="text-sm text-slate-500">Save these login credentials</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Name</span>
                            <span className="text-sm font-medium text-slate-800">{patient.firstName} {patient.lastName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Email</span>
                            <span className="text-sm font-medium text-slate-800">{patient.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Username</span>
                            <span className="text-sm font-medium text-slate-800">{patient.username}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-3 flex justify-between">
                            <span className="text-sm text-slate-500">Password</span>
                            <span className="text-sm font-bold text-teal-700 font-mono tracking-wider">{patient.generatedPassword}</span>
                        </div>
                    </div>

                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-700">
                            ⚠️ This password will not be shown again. Please note it down or print this for the patient.
                        </p>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button onClick={handleCopy}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2">
                            {copied ? "✓ Copied!" : "Copy Credentials"}
                        </button>
                        <button onClick={onClose}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-all">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}