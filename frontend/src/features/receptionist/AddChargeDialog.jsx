import { useState } from "react";
import billService from "../../api/billService";
import { getErrorMessage, getFieldErrors } from "../../lib/apiError";
import { formatMoney, fullName } from "../../lib/format";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { TextField } from "../../components/ui/Field";

// Common staff-entered charges, as suggestions only (prices are editable).
// No "Consultation fee" preset: the server adds it automatically at booking,
// and medication is charged automatically when it is prescribed.
const PRESETS = [
    { label: "Lab test – blood", price: 1500 },
    { label: "Lab test – urine", price: 800 },
    { label: "X-ray", price: 3000 },
    { label: "Injection fee", price: 200 },
    { label: "Dressing / wound care", price: 300 },
];

export default function AddChargeDialog({ bill, onClose, onSaved }) {
    const [form, setForm] = useState({ description: "", quantity: "1", unitPrice: "" });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const set = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setErrors({ ...errors, [e.target.name]: undefined }); };
    const total = Number(form.unitPrice) * Number(form.quantity);

    const submit = async (e) => {
        e.preventDefault();
        const next = {};
        if (!form.description.trim()) next.description = "Describe the charge.";
        if (!(Number(form.quantity) >= 1)) next.quantity = "Quantity must be at least 1.";
        if (!(Number(form.unitPrice) > 0)) next.unitPrice = "Enter a price greater than zero.";
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        setFormError("");
        try {
            const res = await billService.addItem(bill.id, {
                description: form.description.trim(),
                quantity: Number(form.quantity),
                unitPrice: Number(form.unitPrice),
                // Staff-entered charges are MANUAL; consultation and
                // medication charges can only be created by the server.
                source: "MANUAL",
            });
            onSaved(res.data, "Charge added");
        } catch (err) {
            setErrors(getFieldErrors(err));
            setFormError(getErrorMessage(err, "The charge couldn't be added."));
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Add a charge"
            description={`${fullName(bill.patientFirstName, bill.patientLastName)} · Bill #${bill.id}`}
            onClose={onClose}
            busy={saving}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" form="add-charge-form" loading={saving} loadingText="Adding">
                        Add charge{total > 0 ? ` · ${formatMoney(total)}` : ""}
                    </Button>
                </>
            }
        >
            <form id="add-charge-form" onSubmit={submit} noValidate className="space-y-4">
                {formError && <Alert tone="error">{formError}</Alert>}
                <fieldset>
                    <legend className="mb-2 text-sm font-medium text-slate-700">Suggestions</legend>
                    <div className="flex flex-wrap gap-1.5">
                        {PRESETS.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                aria-pressed={form.description === p.label}
                                onClick={() => { setForm({ description: p.label, quantity: "1", unitPrice: String(p.price) }); setErrors({}); }}
                                className={`rounded-full border px-3 py-1 text-xs font-medium ${form.description === p.label ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                            >
                                {p.label} · {formatMoney(p.price)}
                            </button>
                        ))}
                    </div>
                </fieldset>
                <TextField label="Description" name="description" required value={form.description} onChange={set} error={errors.description} data-autofocus />
                <div className="grid grid-cols-2 gap-4">
                    <TextField label="Quantity" name="quantity" type="number" min="1" step="1" required value={form.quantity} onChange={set} error={errors.quantity} />
                    <TextField label="Unit price (KES)" name="unitPrice" type="number" min="0.01" step="0.01" required value={form.unitPrice} onChange={set} error={errors.unitPrice} />
                </div>
            </form>
        </Modal>
    );
}
