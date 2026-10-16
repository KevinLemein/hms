import { useId } from "react";

// Form fields: label, control, hint and error wired together with ids so
// screen readers announce the hint/error with the control, and invalid
// controls are marked aria-invalid.

const CONTROL =
    "w-full rounded-control border bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-500 " +
    "focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 disabled:bg-slate-100 disabled:text-slate-500";

function controlClass(error) {
    return `${CONTROL} ${error ? "border-red-600" : "border-slate-300"}`;
}

function FieldShell({ id, label, hint, error, required, children, className = "" }) {
    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-700" aria-hidden="true"> *</span>}
            </label>
            {children}
            {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">{hint}</p>}
            {error && <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-700">{error}</p>}
        </div>
    );
}

function describedBy(id, hint, error) {
    if (error) return `${id}-error`;
    if (hint) return `${id}-hint`;
    return undefined;
}

export function TextField({ label, hint, error, required, className, id: idProp, ...inputProps }) {
    const generated = useId();
    const id = idProp || generated;
    return (
        <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
            <input
                id={id}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(id, hint, error)}
                className={controlClass(error)}
                {...inputProps}
            />
        </FieldShell>
    );
}

export function TextAreaField({ label, hint, error, required, className, id: idProp, rows = 3, ...inputProps }) {
    const generated = useId();
    const id = idProp || generated;
    return (
        <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
            <textarea
                id={id}
                rows={rows}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(id, hint, error)}
                className={`${controlClass(error)} resize-y`}
                {...inputProps}
            />
        </FieldShell>
    );
}

/** options: [{ value, label, disabled? }] */
export function SelectField({ label, hint, error, required, className, id: idProp, options, placeholder, ...selectProps }) {
    const generated = useId();
    const id = idProp || generated;
    return (
        <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
            <select
                id={id}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(id, hint, error)}
                className={controlClass(error)}
                {...selectProps}
            >
                {placeholder !== undefined && <option value="">{placeholder}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
                ))}
            </select>
        </FieldShell>
    );
}

/** Group heading for a set of fields. */
export function FieldGroup({ title, children }) {
    return (
        <fieldset className="space-y-4">
            <legend className="mb-3 text-sm font-semibold text-slate-700">{title}</legend>
            {children}
        </fieldset>
    );
}
