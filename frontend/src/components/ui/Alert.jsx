import Icon from "./Icon";
import Button from "./Button";

const TONES = {
    error: { box: "bg-red-50 border-red-200 text-red-800", icon: "alertCircle" },
    warning: { box: "bg-amber-50 border-amber-200 text-amber-900", icon: "alertTriangle" },
    success: { box: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: "checkCircle" },
    info: { box: "bg-sky-50 border-sky-200 text-sky-900", icon: "info" },
};

/**
 * Inline message. Errors use role="alert" (announced immediately); other
 * tones use role="status" (announced politely).
 */
export default function Alert({ tone = "info", title, children, onDismiss, action, className = "" }) {
    const t = TONES[tone];
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={`flex items-start gap-3 rounded-control border px-4 py-3 text-sm ${t.box} ${className}`}
        >
            <Icon name={t.icon} className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
                {action && <div className="mt-2">{action}</div>}
            </div>
            {onDismiss && (
                <button type="button" onClick={onDismiss} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss message">
                    <Icon name="x" className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

/** A failed load, with a way to try again. */
export function LoadError({ message, onRetry }) {
    return (
        <Alert
            tone="error"
            title="Couldn't load this information"
            action={onRetry && <Button size="sm" variant="secondary" icon="refresh" onClick={onRetry}>Try again</Button>}
            className="m-4"
        >
            {message}
        </Alert>
    );
}
