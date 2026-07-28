import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../utils/roleRoutes.jsx";

const roleLabels = {
    ROLE_ADMIN: "Admin",
    ROLE_DOCTOR: "Doctor",
    ROLE_RECEPTIONIST: "Receptionist",
    //ROLE_PHARMACIST: "Pharmacist",
    ROLE_PATIENT: "Patient",
};

export default function Login() {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login, user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const sessionExpired = location.state?.sessionExpired;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await login(formData);
            if (response.success) {
                // Always land on the new user's own dashboard. We used to
                // prefer `from` (the page ProtectedRoute redirected them
                // from) so users returned to what they were originally
                // trying to reach — but `from` has no idea which role is
                // logging in. If it pointed to a page for a different role
                // (e.g. left over from a previous session, a stale tab, or
                // browser back-navigation after logout), ProtectedRoute
                // would correctly block it and bounce the user to
                // /unauthorized, which looked like a broken login.
                navigate(dashboardPathForRole(response.data.role), { replace: true });
            } else {
                setError(response.message || "Login failed");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    if (isAuthenticated && user) {
        const destination = dashboardPathForRole(user.role);
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                    <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <svg className="w-7 h-7 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">You're already signed in</h2>
                    <p className="text-slate-500 mt-1">
                        {user.username} ({user.email})
                        {roleLabels[user.role] && (
                            <span className="block text-sm mt-0.5">{roleLabels[user.role]}</span>
                        )}
                    </p>

                    <button
                        onClick={() => navigate(destination, { replace: true })}
                        className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition-all"
                    >
                        Continue to dashboard
                    </button>
                    <button
                        onClick={logout}
                        className="w-full mt-3 text-slate-500 hover:text-slate-700 text-sm font-medium py-2 transition-all"
                    >
                        Sign in with a different account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Panel — Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold tracking-tight">MediCare HMS</span>
                    </div>
                    <h1 className="text-4xl font-bold leading-tight mb-4">
                        Streamlined Healthcare Management
                    </h1>
                    <p className="text-lg text-teal-100 leading-relaxed max-w-md">
                        Register patients, manage appointments, record diagnoses, and
                        prescribe medications — all in one secure platform.
                    </p>
                    <div className="mt-12 space-y-4">
                        {[
                            "Role-based access for doctors & receptionists",
                            "Complete patient medical history",
                            "Appointment scheduling & status tracking",
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 text-teal-100">
                                <svg className="w-5 h-5 text-emerald-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel — Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-slate-800">MediCare HMS</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
                        <p className="text-slate-500 mt-1">Sign in to your account to continue</p>
                    </div>

                    {sessionExpired && !error && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Your session expired. Please sign in again.
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email Address
                            </label>
                            <input
                                id="email" name="email" type="email" required
                                value={formData.email} onChange={handleChange}
                                placeholder="doctor@medicare.com"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Password
                            </label>
                            <input
                                id="password" name="password" type="password" required
                                value={formData.password} onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-slate-400 text-xs">
                        Contact your administrator if you need an account.
                    </p>
                </div>
            </div>
        </div>
    );
}