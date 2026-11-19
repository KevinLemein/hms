import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Icon from "./ui/Icon";
import StatusBadge from "./ui/StatusBadge";
import { fullName } from "../lib/format";

export function BrandMark({ to = "/" }) {
    return (
        <Link to={to} className="flex items-center gap-2.5 rounded-control">
            <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-700 text-white">
                <Icon name="heart" className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold text-slate-900">MediCare</span>
        </Link>
    );
}

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const name = user?.firstName ? fullName(user.firstName, user.lastName) : user?.username;

    return (
        <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <BrandMark to="/dashboard" />
                <div className="flex items-center gap-3">
                    {user?.role && <StatusBadge kind="role" value={user.role} />}
                    <div className="hidden text-right sm:block">
                        <p className="text-sm font-medium text-slate-800">{name}</p>
                        <p className="text-xs text-slate-600">{user?.email}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                        <Icon name="logout" className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            </div>
        </header>
    );
}
