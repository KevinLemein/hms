import Icon from "./Icon";

/** Shown when a list loaded successfully but has nothing in it. */
export default function EmptyState({ icon = "clipboard", title, description, action }) {
    return (
        <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Icon name={icon} className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
