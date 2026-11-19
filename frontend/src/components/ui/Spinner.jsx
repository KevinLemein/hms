// Loading indicators. Spinner announces itself to screen readers via the
// visually hidden label; Skeleton blocks are decorative placeholders.

export function Spinner({ label = "Loading", className = "h-5 w-5" }) {
    return (
        <span role="status" className="inline-flex items-center">
            <span className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />
            <span className="sr-only">{label}</span>
        </span>
    );
}

export function PageSpinner({ label = "Loading" }) {
    return (
        <div className="flex items-center justify-center py-16 text-brand-700">
            <Spinner label={label} className="h-8 w-8" />
        </div>
    );
}

export function SkeletonRows({ rows = 4, label = "Loading" }) {
    return (
        <div role="status" className="space-y-3 p-4">
            <span className="sr-only">{label}</span>
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="h-12 rounded-control bg-slate-100 animate-pulse" aria-hidden="true" />
            ))}
        </div>
    );
}
