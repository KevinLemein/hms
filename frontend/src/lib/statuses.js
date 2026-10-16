// How each status is presented: label, tone and icon. Used by StatusBadge
// and anywhere a status needs to be written out as text.

export const STATUSES = {
    appointment: {
        PENDING: { label: "Booked", tone: "neutral", icon: "calendar" },
        WAITING: { label: "Waiting", tone: "warning", icon: "clock" },
        IN_CONSULTATION: { label: "In consultation", tone: "info", icon: "play" },
        COMPLETED: { label: "Completed", tone: "success", icon: "checkCircle" },
        CANCELLED: { label: "Cancelled", tone: "danger", icon: "ban" },
        NO_SHOW: { label: "No-show", tone: "neutral", icon: "minusCircle" },
    },
    bill: {
        OPEN: { label: "Unpaid", tone: "warning", icon: "alertCircle" },
        PARTIALLY_PAID: { label: "Partially paid", tone: "info", icon: "clock" },
        PAID: { label: "Paid", tone: "success", icon: "checkCircle" },
        CANCELLED: { label: "Cancelled", tone: "neutral", icon: "ban" },
    },
    role: {
        ROLE_ADMIN: { label: "Admin", tone: "brand", icon: "lock" },
        ROLE_DOCTOR: { label: "Doctor", tone: "info", icon: "heart" },
        ROLE_RECEPTIONIST: { label: "Receptionist", tone: "warning", icon: "clipboard" },
        ROLE_PATIENT: { label: "Patient", tone: "success", icon: "user" },
    },
    account: {
        true: { label: "Active", tone: "success", icon: "checkCircle" },
        false: { label: "Disabled", tone: "danger", icon: "ban" },
    },
};

export function statusLabel(kind, value) {
    return STATUSES[kind]?.[String(value)]?.label ?? String(value ?? "Unknown").replaceAll("_", " ");
}
