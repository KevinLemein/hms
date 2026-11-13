import { useCallback, useState } from "react";
import scheduleService from "../../api/scheduleService";
import { useToast } from "../../context/ToastContext";
import useLoader from "../../lib/useLoader";
import { getErrorMessage } from "../../lib/apiError";
import { formatDate } from "../../lib/format";
import { todayIso } from "../../lib/slots";
import { Card, CardHeader } from "../../components/ui/Card";
import { TextField } from "../../components/ui/Field";
import Alert, { LoadError } from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonRows } from "../../components/ui/Spinner";

const EMPTY = { startDate: "", endDate: "", reason: "" };
// "yyyy-MM-dd" is read as UTC by Date; add a time so it shows the same calendar day everywhere.
const day = (iso) => formatDate(`${iso}T00:00:00`);

/** Days a doctor is away (leave, training, holidays): nobody can book them on those days. */
export default function TimeOffSection({ doctorId }) {
    const { showSuccess, showError } = useToast();
    const load = useCallback(() => scheduleService.getTimeOff(doctorId).then((r) => r.data), [doctorId]);
    const { data, loading, error, reload } = useLoader(load, { initialData: [] });
    const [form, setForm] = useState(EMPTY);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [removingId, setRemovingId] = useState(null);

    const set = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setFormError(""); };

    const add = async (e) => {
        e.preventDefault();
        if (!form.startDate || !form.endDate) { setFormError("Choose the first and last day."); return; }
        if (form.endDate < form.startDate) { setFormError("The last day can't be before the first day."); return; }
        setSaving(true);
        try {
            await scheduleService.addTimeOff(doctorId, form);
            showSuccess("Time off added");
            setForm(EMPTY);
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "The time off couldn't be added."));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (item) => {
        setRemovingId(item.id);
        try {
            await scheduleService.removeTimeOff(doctorId, item.id);
            showSuccess("Time off removed");
            reload();
        } catch (err) {
            showError(getErrorMessage(err, "The time off couldn't be removed."));
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <Card>
            <CardHeader
                title="Time off"
                description="Whole days when no appointments can be booked. Appointments already booked on those days are not cancelled."
            />
            <div className="space-y-5 px-5 py-5">
                <form onSubmit={add} noValidate className="space-y-3">
                    {formError && <Alert tone="error">{formError}</Alert>}
                    <div className="grid gap-3 sm:grid-cols-3">
                        <TextField label="First day" name="startDate" type="date" min={todayIso()} value={form.startDate} onChange={set} />
                        <TextField label="Last day" name="endDate" type="date" min={form.startDate || todayIso()} value={form.endDate} onChange={set} />
                        <TextField label="Reason (optional)" name="reason" maxLength={255} value={form.reason} onChange={set} placeholder="e.g. Annual leave" />
                    </div>
                    <Button type="submit" icon="plus" loading={saving} loadingText="Adding">Add time off</Button>
                </form>

                {loading ? (
                    <SkeletonRows rows={2} label="Loading time off" />
                ) : error ? (
                    <LoadError message={error} onRetry={reload} />
                ) : data.length === 0 ? (
                    <EmptyState icon="calendar" title="No upcoming time off" />
                ) : (
                    <ul className="divide-y divide-slate-200 rounded-control border border-slate-200">
                        {data.map((t) => (
                            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        {t.startDate === t.endDate ? day(t.startDate) : `${day(t.startDate)} – ${day(t.endDate)}`}
                                    </p>
                                    {t.reason && <p className="text-xs text-slate-600">{t.reason}</p>}
                                </div>
                                <Button size="sm" variant="dangerOutline" loading={removingId === t.id} loadingText="Removing"
                                        onClick={() => remove(t)} aria-label={`Remove time off starting ${day(t.startDate)}`}>
                                    Remove
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Card>
    );
}
