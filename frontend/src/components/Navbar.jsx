import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const roleConfig = {
    ROLE_ADMIN: { label: "Admin", color: "bg-purple-100 text-purple-700 border-purple-200" },
    ROLE_DOCTOR: { label: "Doctor", color: "bg-blue-100 text-blue-700 border-blue-200" },
    ROLE_RECEPTIONIST: { label: "Receptionist", color: "bg-amber-100 text-amber-700 border-amber-200" },
    ROLE_PATIENT: { label: "Patient", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const role = roleConfig[user?.role] || { label: user?.role, color: "bg-slate-100 text-slate-700" };

    return (
        <nav className="bg-white border-b border-slate-200 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link to="/dashboard" className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold text-slate-800">MediCare HMS</span>
                </Link>

                <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${role.color}`}>
            {role.label}
          </span>
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
    );
}