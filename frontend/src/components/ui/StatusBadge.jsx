import Icon from "./Icon";
import { STATUSES, statusLabel } from "../../lib/statuses";

// Every badge carries a text label and an icon, so status is never
// conveyed by colour alone.

const TONE = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    info: "bg-sky-50 text-sky-800 ring-sky-200",
    warning: "bg-amber-50 text-amber-900 ring-amber-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    danger: "bg-red-50 text-red-800 ring-red-200",
    brand: "bg-brand-50 text-brand-800 ring-brand-200",
};

export default function StatusBadge({ kind, value }) {
    const s = STATUSES[kind]?.[String(value)] ?? { label: statusLabel(kind, value), tone: "neutral", icon: "info" };
    return (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[s.tone]}`}>
            <Icon name={s.icon} className="h-3.5 w-3.5" />
            {s.label}
        </span>
    );
}
