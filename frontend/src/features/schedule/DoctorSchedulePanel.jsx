import { useCallback, useState } from "react";
import scheduleService from "../../api/scheduleService";
import { useToast } from "../../context/ToastContext";
import useLoader from "../../lib/useLoader";
import { getErrorMessage } from "../../lib/apiError";
import { DAYS } from "../../lib/slots";
import { Card, CardHeader } from "../../components/ui/Card";
import Alert, { LoadError } from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import { SkeletonRows } from "../../components/ui/Spinner";
import TimeOffSection from "./TimeOffSection";

const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60, 90, 120];
const NEW_BLOCK = { startTime: "08:00", endTime: "12:00", slotMinutes: 30 };

const inputClass =
    "rounded-control border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 " +
    "focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600";

/** Weekly working hours: one or more time ranges per day, each cut into slots of a chosen length. */
function ScheduleEditor({ doctorId, initial, custom, onSaved }) {
    const { showSuccess } = useToast();
    const [blocks, setBlocks] = useState(() => initial.map((b) => ({ ...b })));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const update = (index, patch) => {
        setBlocks((list) => list.map((b, i) => (i === index ? { ...b, ...patch } : b)));
        setError("");
    };
    const remove = (index) => setBlocks((list) => list.filter((_, i) => i !== index));
    const add = (dayOfWeek) => setBlocks((list) => [...list, { dayOfWeek, ...NEW_BLOCK }]);

    const save = async (toSave, message) => {
        setSaving(true);
        setError("");
        try {
            const res = await scheduleService.saveSchedule(doctorId, toSave);
            showSuccess(message);
            onSaved(res.data);
        } catch (err) {
            setError(getErrorMessage(err, "The schedule couldn't be saved."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader
                title="Weekly working hours"
                description="Patients can only book the free slots inside these hours. Existing appointments are not moved when you change them."
            />
            <div className="space-y-4 px-5 py-5">
                {!custom && (
                    <Alert tone="info">
                        No schedule is saved yet, so the clinic's default hours apply every day. Adjust the days below and save to set your own.
                    </Alert>
                )}
                {error && <Alert tone="error">{error}</Alert>}

                <div className="divide-y divide-slate-200">
                    {DAYS.map((day) => {
                        const rows = blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.dayOfWeek === day.value);
                        return (
                            <div key={day.value} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                                <div className="w-28 shrink-0 pt-1.5 text-sm font-medium text-slate-800">{day.label}</div>
                                <div className="flex-1 space-y-2">
                                    {rows.length === 0 && <p className="pt-1.5 text-sm text-slate-600">Not working</p>}
                                    {rows.map(({ b, i }) => (
                                        <div key={i} className="flex flex-wrap items-center gap-2">
                                            <input type="time" aria-label={`${day.label} start time`} className={inputClass}
                                                   value={b.startTime} onChange={(e) => update(i, { startTime: e.target.value })} />
                                            <span className="text-sm text-slate-600">to</span>
                                            <input type="time" aria-label={`${day.label} end time`} className={inputClass}
                                                   value={b.endTime} onChange={(e) => update(i, { endTime: e.target.value })} />
                                            <select aria-label={`${day.label} slot length`} className={inputClass}
                                                    value={b.slotMinutes} onChange={(e) => update(i, { slotMinutes: Number(e.target.value) })}>
                                                {[...new Set([...SLOT_LENGTHS, b.slotMinutes])].sort((x, y) => x - y).map((m) => (
                                                    <option key={m} value={m}>{m} min slots</option>
                                                ))}
                                            </select>
                                            <Button size="sm" variant="ghost" icon="x" onClick={() => remove(i)} aria-label={`Remove ${day.label} hours`}>
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                    <Button size="sm" variant="ghost" icon="plus" onClick={() => add(day.value)}>
                                        Add hours
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => save(blocks, "Schedule saved")} loading={saving} loadingText="Saving">Save schedule</Button>
                    {custom && (
                        <Button variant="secondary" disabled={saving}
                                onClick={() => save([], "Back to the clinic's default hours")}>
                            Use clinic default hours
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}

/** A doctor's working hours and time off. `doctorId` is the doctor's user id. */
export default function DoctorSchedulePanel({ doctorId }) {
    const load = useCallback(() => scheduleService.getSchedule(doctorId).then((r) => r.data), [doctorId]);
    const { data, loading, error, reload, setData } = useLoader(load);
    // Remount the editor after a save so it starts from what the server stored.
    const [version, setVersion] = useState(0);

    if (loading && !data) return <Card aria-busy="true"><SkeletonRows label="Loading schedule" /></Card>;
    if (error) return <Card><LoadError message={error} onRetry={reload} /></Card>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            <ScheduleEditor
                key={`${doctorId}-${version}`}
                doctorId={doctorId}
                initial={data.blocks}
                custom={data.custom}
                onSaved={(saved) => { setData(saved); setVersion((v) => v + 1); }}
            />
            <TimeOffSection doctorId={doctorId} />
        </div>
    );
}
