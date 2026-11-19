import Icon from "./Icon";
import { Spinner } from "./Spinner";

const VARIANTS = {
    primary: "bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-700",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-700 text-white hover:bg-red-800 disabled:bg-red-700",
    dangerOutline: "bg-white text-red-700 border border-red-300 hover:bg-red-50",
    ghost: "text-slate-700 hover:bg-slate-100",
};

const SIZES = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
};

/**
 * Button with consistent variants. While `loading` it is disabled and shows
 * a spinner, which also prevents duplicate submissions of the same action.
 * Defaults to type="button" so it never submits a form by accident.
 */
export default function Button({
    variant = "primary",
    size = "md",
    icon,
    loading = false,
    loadingText,
    disabled,
    className = "",
    children,
    type = "button",
    ...rest
}) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={`inline-flex items-center justify-center rounded-control font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
            {...rest}
        >
            {loading ? <Spinner label={loadingText || "Working"} className="h-4 w-4" /> : icon && <Icon name={icon} className="w-4 h-4" />}
            {loading && loadingText ? loadingText : children}
        </button>
    );
}
