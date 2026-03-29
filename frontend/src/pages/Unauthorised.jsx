import { Link } from "react-router-dom";

export default function Unauthorized() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
            <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🚫</div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
                <p className="text-slate-500 mb-8">
                    You don't have permission to access this page. Please contact your
                    administrator if you believe this is an error.
                </p>
                <Link
                    to="/dashboard"
                    className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-lg transition-all"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}