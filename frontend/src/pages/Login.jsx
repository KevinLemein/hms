import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../utils/roleRoutes.jsx";
import { BrandMark } from "../components/Navbar";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { TextField } from "../components/ui/Field";
import { getErrorMessage } from "../lib/apiError";

export default function Login() {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login, user, isAuthenticated } = useAuth();
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
                navigate(dashboardPathForRole(response.data.role), { replace: true });
            } else {
                setError(response.message || "Login failed");
            }
        } catch (err) {
            // 401 here means wrong credentials, not an expired session.
            setError(err.response?.status === 401
                ? "Incorrect email or password."
                : getErrorMessage(err, "Sign-in failed. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    if (isAuthenticated && user) {
        return <Navigate to={dashboardPathForRole(user.role)} replace />;
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <aside className="hidden w-5/12 flex-col justify-between bg-brand-800 p-12 text-white lg:flex">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-control bg-white/15">
                        <Icon name="heart" className="h-5 w-5" />
                    </span>
                    <span className="text-lg font-semibold">MediCare</span>
                </div>
                <div>
                    <h2 className="text-3xl font-semibold leading-tight">Clinic management for outpatient care</h2>
                    <ul className="mt-8 space-y-3 text-brand-100">
                        {[
                            "Patient registration and appointment booking",
                            "Consultation queue and prescriptions",
                            "Billing and payment records",
                        ].map((f) => (
                            <li key={f} className="flex items-center gap-3">
                                <Icon name="checkCircle" className="h-5 w-5 flex-shrink-0 text-brand-200" />
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-sm text-brand-200">Access is limited to registered staff and patients.</p>
            </aside>

            <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-sm">
                    <div className="mb-8 lg:hidden"><BrandMark /></div>

                    <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
                    <p className="mt-1 text-sm text-slate-600">Use the email and password from your clinic.</p>

                    <div className="mt-6 space-y-4">
                        {sessionExpired && !error && (
                            <Alert tone="warning">Your session expired. Please sign in again.</Alert>
                        )}
                        {error && <Alert tone="error">{error}</Alert>}
                    </div>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate={false}>
                        <TextField
                            label="Email address"
                            name="email"
                            type="email"
                            autoComplete="username"
                            required
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                        />
                        <Button type="submit" loading={loading} loadingText="Signing in" className="w-full">
                            Sign in
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-600">
                        Don't have an account? Patients are registered at the reception desk; staff accounts are created by an administrator.
                    </p>
                </div>
            </main>
        </div>
    );
}
