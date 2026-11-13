import { useCallback } from "react";
import appointmentService from "../../api/appointmentService";
import useLoader from "../../lib/useLoader";
import { todayIso } from "../../lib/slots";
import { TextField } from "../../components/ui/Field";
import Alert from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";

/**
 * Day + free-slot chooser for one doctor. The backend decides which times
 * are free (working hours, time off, existing bookings), so this only shows
 * what it returns. `value` is { date, slot }.
 */
export default function SlotPicker({ doctorId, value, onChange, ignoreAppointmentId, error }) {
    const load = useCallback(
        () => (doctorId && value.date
            ? appointmentService.getSlots(doctorId, value.date, ignoreAppointmentId).then((r) => r.data)
            : Promise.resolve([])),
        [doctorId, value.date, ignoreAppointmentId],
    );
    const slots = useLoader(load, { initialData: [] });
    const ready = doctorId && value.date;

    return (
        <div className="space-y-3">
            <TextField
                label="Date"
                type="date"
                required
                min={todayIso()}
                value={value.date}
                onChange={(e) => onChange({ date: e.target.value, slot: "" })}
            />

            <fieldset aria-describedby={error ? "slot-error" : undefined}>
                <legend className="mb-1.5 text-sm font-medium text-slate-700">
                    Time<span className="text-red-700" aria-hidden="true"> *</span>
                </legend>
                {!ready ? (
                    <p className="text-sm text-slate-600">Choose a doctor and a date to see the free times.</p>
                ) : slots.loading ? (
                    <Spinner label="Loading free times" className="h-5 w-5" />
                ) : slots.error ? (
                    <Alert tone="error">{slots.error}</Alert>
                ) : (slots.data || []).length === 0 ? (
                    <p className="text-sm text-slate-600">No free times on this day. Try another date.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {slots.data.map((s) => (
                            <label
                                key={s}
                                className={`cursor-pointer rounded-control border px-3 py-1.5 text-sm font-medium focus-within:ring-2 focus-within:ring-brand-600 ${
                                    value.slot === s
                                        ? "border-brand-700 bg-brand-700 text-white"
                                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="slot"
                                    value={s}
                                    checked={value.slot === s}
                                    onChange={() => onChange({ ...value, slot: s })}
                                    className="sr-only"
                                />
                                {s}
                            </label>
                        ))}
                    </div>
                )}
                {error && <p id="slot-error" className="mt-1 text-xs font-medium text-red-700">{error}</p>}
            </fieldset>
        </div>
    );
}
