// Display formatting shared by every screen. Dates come from the API as
// ISO local date-times (no zone); they are shown in the browser's locale.

const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2 });

export function formatMoney(value) {
    if (value === null || value === undefined || value === "") return "—";
    return money.format(Number(value));
}

export function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value) {
    if (!value) return "—";
    return `${formatDate(value)}, ${formatTime(value)}`;
}

export function fullName(first, last) {
    return [first, last].filter(Boolean).join(" ") || "—";
}

/** <input type="datetime-local"> gives "yyyy-MM-ddTHH:mm"; the API expects seconds. */
export function toApiDateTime(localValue) {
    if (localValue && localValue.split(":").length === 2) return `${localValue}:00`;
    return localValue;
}
