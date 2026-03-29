import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const getRoleBadge = (role) => {
        const styles = {
            ROLE_DOCTOR: "bg-blue-100 text-blue-700 border-blue-200",
            ROLE_RECEPTIONIST: "bg-amber-100 text-amber-700 border-amber-200",
            ROLE_PATIENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
        };
        const labels = {
            ROLE_DOCTOR: "Doctor",
            ROLE_RECEPTIONIST: "Receptionist",
            ROLE_PATIENT: "Patient",
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[role] || "bg-slate-100 text-slate-700"}`}>
        {labels[role] || role}
      </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-slate-800">MediCare HMS</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {getRoleBadge(user?.role)}
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-slate-800">{user?.username}</p>
                            <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">
                        Welcome, {user?.username}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        You're logged in as {getRoleBadge(user?.role)}
                    </p>
                </div>

                {/* Placeholder Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {user?.role === "ROLE_DOCTOR" && (
                        <>
                            <DashboardCard
                                title="My Patients"
                                description="View and manage your assigned patients"
                                icon="👨‍⚕️"
                                color="blue"
                            />
                            <DashboardCard
                                title="Appointments"
                                description="View today's appointments and schedule"
                                icon="📅"
                                color="teal"
                            />
                            <DashboardCard
                                title="Medical Records"
                                description="Add diagnoses and prescriptions"
                                icon="📋"
                                color="emerald"
                            />
                        </>
                    )}

                    {user?.role === "ROLE_RECEPTIONIST" && (
                        <>
                            <DashboardCard
                                title="Register Patient"
                                description="Register a new patient in the system"
                                icon="🏥"
                                color="amber"
                            />
                            <DashboardCard
                                title="Search Patients"
                                description="Find and view patient records"
                                icon="🔍"
                                color="teal"
                            />
                            <DashboardCard
                                title="Book Appointment"
                                description="Schedule a new appointment"
                                icon="📅"
                                color="blue"
                            />
                        </>
                    )}

                    {user?.role === "ROLE_PATIENT" && (
                        <>
                            <DashboardCard
                                title="My Records"
                                description="View your medical history"
                                icon="📋"
                                color="emerald"
                            />
                            <DashboardCard
                                title="Appointments"
                                description="View your upcoming appointments"
                                icon="📅"
                                color="teal"
                            />
                            <DashboardCard
                                title="Prescriptions"
                                description="View your current prescriptions"
                                icon="💊"
                                color="blue"
                            />
                        </>
                    )}
                </div>

                {/* Auth Debug Info — remove in production */}
                <div className="mt-10 bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                        Auth Debug Info
                    </h3>
                    <pre className="bg-slate-900 text-emerald-400 text-sm p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
                </div>
            </main>
        </div>
    );
}

function DashboardCard({ title, description, icon, color }) {
    const colorMap = {
        blue: "bg-blue-50 border-blue-100 hover:border-blue-300",
        teal: "bg-teal-50 border-teal-100 hover:border-teal-300",
        emerald: "bg-emerald-50 border-emerald-100 hover:border-emerald-300",
        amber: "bg-amber-50 border-amber-100 hover:border-amber-300",
    };

    return (
        <div className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${colorMap[color]}`}>
            <span className="text-3xl">{icon}</span>
            <h3 className="text-lg font-semibold text-slate-800 mt-3">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
    );
}