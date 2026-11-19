import { Link } from "react-router-dom";
import Icon from "../components/ui/Icon";

export default function Unauthorized() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
                    <Icon name="lock" className="h-7 w-7" />
                </div>
                <h1 className="mb-2 text-xl font-semibold text-slate-900">You don't have access to this page</h1>
                <p className="mb-6 text-sm text-slate-600">
                    Your account doesn't have permission to view it. If you think this is a mistake, contact your administrator.
                </p>
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-control bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
                >
                    Go to my dashboard
                </Link>
            </div>
        </main>
    );
}
