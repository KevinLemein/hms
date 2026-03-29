import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <nav className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-slate-800">MediCare HMS</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/register"
                            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-10 left-20 w-96 h-96 bg-white rounded-full blur-3xl" />
                        <div className="absolute bottom-10 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full blur-3xl opacity-5" />
                    </div>
                </div>

                <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 lg:py-32">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-teal-100 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            Hospital Management System
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
                            Manage Your Hospital,{" "}
                            <span className="text-emerald-300">Simplified</span>
                        </h1>
                        <p className="text-lg text-teal-100 leading-relaxed mb-10 max-w-lg">
                            A complete platform for managing patients, appointments, diagnoses, and
                            prescriptions. Built for doctors and receptionists who need things to
                            just work.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-2 bg-white text-teal-700 font-semibold px-8 py-3.5 rounded-lg hover:bg-teal-50 transition-all shadow-lg shadow-black/10"
                            >
                                Sign In to Your Account
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <Link
                                to="/register"
                                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold px-8 py-3.5 rounded-lg hover:bg-white/20 transition-all border border-white/20"
                            >
                                Create Account
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="max-w-6xl mx-auto px-6 py-20">
                <div className="text-center mb-14">
                    <h2 className="text-3xl font-bold text-slate-800 mb-3">
                        Everything You Need
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Role-based tools designed for how hospitals actually operate
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        {
                            icon: (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            ),
                            title: "Patient Registration",
                            description:
                                "Receptionists can quickly register new patients and search existing records in seconds.",
                            color: "teal",
                        },
                        {
                            icon: (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            ),
                            title: "Appointment Scheduling",
                            description:
                                "Book and manage appointments with status tracking from waiting to consultation to completed.",
                            color: "blue",
                        },
                        {
                            icon: (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            ),
                            title: "Medical Records",
                            description:
                                "Complete visit history with diagnoses, clinical notes, and prescriptions all in one place.",
                            color: "emerald",
                        },
                        {
                            icon: (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            ),
                            title: "Prescriptions",
                            description:
                                "Doctors can prescribe medication with dosage details and duration, all linked to the patient visit.",
                            color: "amber",
                        },
                        {
                            icon: (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            ),
                            title: "Secure Access",
                            description:
                                "JWT-based authentication with role-based access control. Doctors and receptionists see only what they need.",
                            color: "rose",
                        },
                        {
                            icon: (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            ),
                            title: "Status Tracking",
                            description:
                                "Track each patient's journey — from waiting room to consultation to completed visit.",
                            color: "violet",
                        },
                    ].map((feature, i) => (
                        <FeatureCard key={i} {...feature} />
                    ))}
                </div>
            </section>

            {/* Roles Section */}
            <section className="bg-white border-y border-slate-200">
                <div className="max-w-6xl mx-auto px-6 py-20">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-bold text-slate-800 mb-3">
                            Built for Every Role
                        </h2>
                        <p className="text-slate-500 max-w-md mx-auto">
                            Each user sees a tailored dashboard with only the tools they need
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <RoleCard
                            emoji="👨‍⚕️"
                            role="Doctor"
                            color="blue"
                            tasks={[
                                "View assigned patients & appointments",
                                "Add diagnosis and clinical notes",
                                "Prescribe medication with dosage",
                                "Access past medical records",
                            ]}
                        />
                        <RoleCard
                            emoji="🏥"
                            role="Receptionist"
                            color="amber"
                            tasks={[
                                "Register new patients",
                                "Search existing patient records",
                                "Book and manage appointments",
                                "View basic patient history",
                            ]}
                        />
                        <RoleCard
                            emoji="🧑‍🤝‍🧑"
                            role="Patient"
                            color="emerald"
                            tasks={[
                                "View personal medical records",
                                "Check upcoming appointments",
                                "See prescription history",
                                "Read-only secure dashboard",
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="max-w-6xl mx-auto px-6 py-20">
                <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 rounded-2xl p-10 lg:p-16 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-10 -right-10 w-72 h-72 bg-white rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                            Ready to Get Started?
                        </h2>
                        <p className="text-teal-100 text-lg mb-8 max-w-md mx-auto">
                            Sign in to access your dashboard or create a new account to join the platform.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-2 bg-white text-teal-700 font-semibold px-8 py-3.5 rounded-lg hover:bg-teal-50 transition-all shadow-lg shadow-black/10"
                            >
                                Sign In
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <Link
                                to="/register"
                                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold px-8 py-3.5 rounded-lg hover:bg-white/20 transition-all border border-white/20"
                            >
                                Create Account
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200">
                <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <div className="w-6 h-6 bg-teal-600 rounded-md flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        MediCare HMS
                    </div>
                    <p className="text-slate-400 text-sm">
                        &copy; {new Date().getFullYear()} MediCare HMS. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description, color }) {
    const iconBg = {
        teal: "bg-teal-100 text-teal-600",
        blue: "bg-blue-100 text-blue-600",
        emerald: "bg-emerald-100 text-emerald-600",
        amber: "bg-amber-100 text-amber-600",
        rose: "bg-rose-100 text-rose-600",
        violet: "bg-violet-100 text-violet-600",
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconBg[color]}`}>
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        </div>
    );
}

function RoleCard({ emoji, role, color, tasks }) {
    const borderColor = {
        blue: "border-blue-200 hover:border-blue-400",
        amber: "border-amber-200 hover:border-amber-400",
        emerald: "border-emerald-200 hover:border-emerald-400",
    };
    const checkColor = {
        blue: "text-blue-500",
        amber: "text-amber-500",
        emerald: "text-emerald-500",
    };

    return (
        <div className={`bg-white rounded-xl border-2 p-8 transition-all duration-300 hover:shadow-lg ${borderColor[color]}`}>
            <span className="text-4xl">{emoji}</span>
            <h3 className="text-xl font-bold text-slate-800 mt-4 mb-4">{role}</h3>
            <ul className="space-y-3">
                {tasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${checkColor[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {task}
                    </li>
                ))}
            </ul>
        </div>
    );
}