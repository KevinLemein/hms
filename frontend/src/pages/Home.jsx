import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { BrandMark } from "../components/Navbar";
import Icon from "../components/ui/Icon";

// Describes only what the system does today: a clinic tool used by staff,
// with a read-only view for registered patients. No public sign-up,
// self-booking or physician directory exists.
const FEATURES = [
    { icon: "userPlus", title: "Patient registration", text: "Reception registers patients, records allergies and emergency contacts, and finds existing records by name, email or phone." },
    { icon: "calendar", title: "Appointments and queue", text: "Book appointments with a doctor, check patients in, and follow each visit from arrival to completion." },
    { icon: "pill", title: "Prescriptions", text: "Doctors prescribe from the clinic's drug catalogue; stock is deducted and the visit's bill updated automatically." },
    { icon: "receipt", title: "Billing and payments", text: "Consultation and medication charges are added automatically; reception records cash, M-Pesa and card payments." },
    { icon: "user", title: "Patient view", text: "Registered patients can sign in to see their appointments, prescriptions and bills." },
    { icon: "lock", title: "Role-based access", text: "Admins, doctors, receptionists and patients each see only the screens and records their role allows." },
];

export default function Home() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/", { replace: true });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <BrandMark />
                    <nav className="flex items-center gap-2">
                        {isAuthenticated && user ? (
                            <>
                                <Link to="/dashboard" className="rounded-control px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50">
                                    My dashboard
                                </Link>
                                <button type="button" onClick={handleLogout} className="rounded-control px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="rounded-control bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
                                Sign in
                            </Link>
                        )}
                    </nav>
                </div>
            </header>

            <main>
                <section className="border-b border-slate-200 bg-white">
                    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
                        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Outpatient clinic management</p>
                        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                            Registration, appointments, prescriptions and billing in one place
                        </h1>
                        <p className="mt-4 max-w-xl text-base text-slate-600">
                            MediCare supports the day-to-day work of a small outpatient clinic, from the reception desk to the consultation room.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                to={isAuthenticated ? "/dashboard" : "/login"}
                                className="inline-flex items-center gap-2 rounded-control bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
                            >
                                {isAuthenticated ? "Go to my dashboard" : "Sign in"}
                                <Icon name="arrowRight" className="h-4 w-4" />
                            </Link>
                        </div>
                        <p className="mt-4 text-sm text-slate-600">
                            Patients receive their sign-in details when they register at reception.
                        </p>
                    </div>
                </section>

                <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                    <h2 id="features-heading" className="text-xl font-semibold text-slate-900">What it does</h2>
                    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map((f) => (
                            <li key={f.title} className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
                                <span className="flex h-10 w-10 items-center justify-center rounded-control bg-brand-50 text-brand-700">
                                    <Icon name={f.icon} className="h-5 w-5" />
                                </span>
                                <h3 className="mt-3 text-base font-semibold text-slate-900">{f.title}</h3>
                                <p className="mt-1 text-sm text-slate-600">{f.text}</p>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-slate-600 sm:px-6">
                    <span>MediCare</span>
                    <span>&copy; {new Date().getFullYear()} MediCare</span>
                </div>
            </footer>
        </div>
    );
}
