// Section containers and page headings.

export function Card({ children, className = "", ...rest }) {
    return (
        <section className={`rounded-card border border-slate-200 bg-white shadow-card ${className}`} {...rest}>
            {children}
        </section>
    );
}

/** Heading row inside a Card. `level` keeps the document outline correct. */
export function CardHeader({ title, description, actions, level = 2, id }) {
    const H = `h${level}`;
    return (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
                <H id={id} className="text-base font-semibold text-slate-800">{title}</H>
                {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/** The single h1 of a screen, with optional supporting text and actions. */
export function PageHeader({ title, description, actions }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
                {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/** Label/value pairs, e.g. a patient's details. items: [{ label, value }] */
export function DetailList({ items, columns = "sm:grid-cols-2 lg:grid-cols-3" }) {
    return (
        <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 ${columns}`}>
            {items.map((item) => (
                <div key={item.label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">{item.label}</dt>
                    <dd className={`mt-0.5 text-sm ${item.emphasis ? "font-semibold text-red-700" : "text-slate-800"}`}>
                        {item.value || "—"}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
