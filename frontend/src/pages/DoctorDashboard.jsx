import Navbar from "../components/Navbar";

export default function DoctorDashboard() {
    const quickActions = [
        {
            title: "Current Patients",
            description: "View patients assigned to you today",
            icon: "👨‍⚕️",
            color: "border-blue-100 bg-blue-50 hover:border-blue-300",
            disabled: true,
        },
        {
            title: "Appointments",
            description: "View your schedule and upcoming appointments",
            icon: "📅",
            color: "border-teal-100 bg-teal-50 hover:border-teal-300",
            disabled: true,
        },
        {
            title: "Search Patient History",
            description: "Search all treated patients' medical records",
            icon: "🔍",
            color: "border-emerald-100 bg-emerald-50 hover:border-emerald-300",
            disabled: true,
        },
        {
            title: "Prescriptions",
            description: "View and manage prescriptions",
            icon: "💊",
            color: "border-violet-100 bg-violet-50 hover:border-violet-300",
            disabled: true,
        },
        {
            title: "Medical Records",
            description: "Add diagnosis, notes, and records",
            icon: "📋",
            color: "border-rose-100 bg-rose-50 hover:border-rose-300",
            disabled: true,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">Doctor Dashboard</h1>
                    <p className="text-slate-500 mt-1">Manage patients, records, and prescriptions</p>
                </div>

                {/* Quick Actions */}
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    {quickActions.map((action, i) => (
                        <div
                            key={i}
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

                {/* Today's Overview */}
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Today's Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Patients Today", value: "—", icon: "🧑" },
                        { label: "Appointments", value: "—", icon: "📅" },
                        { label: "In Consultation", value: "—", icon: "🩺" },
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
            </main>
        </div>
    );
}