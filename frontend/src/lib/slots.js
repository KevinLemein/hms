// Helpers for the day + slot booking pickers.

/** Today's date in the browser's local time as "yyyy-MM-dd". */
export function todayIso() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "yyyy-MM-dd" + "HH:mm" -> the API's "yyyy-MM-ddTHH:mm:ss". */
export function toSlotDateTime(date, slot) {
    return `${date}T${slot}:00`;
}

export const DAYS = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 7, label: "Sunday" },
];
