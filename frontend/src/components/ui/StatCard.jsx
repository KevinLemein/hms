import Icon from "./Icon";

/** A single headline number. Grid of these: <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"> */
export default function StatCard({ label, value, icon }) {
    return (
        <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-600">{label}</p>
                {icon && <Icon name={icon} className="h-5 w-5 text-brand-700" />}
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
        </div>
    );
}
