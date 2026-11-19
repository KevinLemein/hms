import { useState } from "react";
import billService from "../../api/billService";
import { getErrorMessage, getFieldErrors } from "../../lib/apiError";
import { formatMoney, fullName } from "../../lib/format";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import Icon from "../../components/ui/Icon";
import { TextField } from "../../components/ui/Field";

const METHODS = [
    { value: "CASH", label: "Cash", icon: "cash" },
    { value: "MPESA", label: "M-Pesa", icon: "phone" },
    { value: "CARD", label: "Card", icon: "card" },
];

/**
 * Records a payment against a bill (RecordPaymentRequest: amount, method,
 * reference). The backend requires a reference for M-Pesa and card, rejects
 * amounts above the balance, and rejects a reference already recorded (409).
 */
export default function RecordPaymentDialog({ bill, onClose, onSaved }) {
    const balance = Number(bill.balance);
    const [form, setForm] = useState({ amount: balance.toFixed(2), method: "CASH", reference: "" });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const needsReference = form.method !== "CASH";
    const set = (name, value) => { setForm({ ...form, [name]: value }); setErrors({ ...errors, [name]: undefined }); };

    const submit = async (e) => {
        e.preventDefault();
        const amount = Number(form.amount);
        const next = {};
        if (!(amount > 0)) next.amount = "Enter an amount greater than zero.";
        else if (amount > balance) next.amount = `The balance due is ${formatMoney(balance)}.`;
        if (needsReference && !form.reference.trim()) {
            next.reference = form.method === "MPESA" ? "Enter the M-Pesa transaction code." : "Enter the card approval code.";
        }
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        setFormError("");
        try {
            const res = await billService.recordPayment(bill.id, {
                amount,
                method: form.method,
                reference: needsReference ? form.reference.trim() : null,
            });
            onSaved(res.data, `Payment of ${formatMoney(amount)} recorded`);
        } catch (err) {
            setErrors(getFieldErrors(err));
            setFormError(getErrorMessage(err, "The payment couldn't be recorded."));
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Record a payment"
            description={`${fullName(bill.patientFirstName, bill.patientLastName)} · Bill #${bill.id}`}
            onClose={onClose}
            busy={saving}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" form="record-payment-form" loading={saving} loadingText="Recording">
                        Record {formatMoney(Number(form.amount) || 0)}
                    </Button>
                </>
            }
        >
            <form id="record-payment-form" onSubmit={submit} noValidate className="space-y-4">
                {formError && <Alert tone="error">{formError}</Alert>}

                <div className="flex items-center justify-between rounded-control bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-600">Balance due</span>
                    <span className="text-xl font-semibold tabular-nums text-slate-900">{formatMoney(balance)}</span>
                </div>

                <TextField
                    label="Amount received (KES)"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={balance}
                    required
                    value={form.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    error={errors.amount}
                    hint="Enter less than the balance for a part payment."
                    data-autofocus
                />

                <fieldset>
                    <legend className="mb-2 text-sm font-medium text-slate-700">Payment method</legend>
                    <div className="grid grid-cols-3 gap-2">
                        {METHODS.map((m) => (
                            <label
                                key={m.value}
                                className={`flex cursor-pointer flex-col items-center gap-1 rounded-control border-2 px-2 py-3 text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-700 ${form.method === m.value ? "border-brand-700 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}
                            >
                                <input type="radio" name="method" value={m.value} checked={form.method === m.value}
                                       onChange={() => set("method", m.value)} className="sr-only" />
                                <Icon name={m.icon} className="h-5 w-5" />
                                {m.label}
                            </label>
                        ))}
                    </div>
                </fieldset>

                {needsReference && (
                    <TextField
                        label={form.method === "MPESA" ? "M-Pesa transaction code" : "Card approval code"}
                        name="reference"
                        required
                        autoComplete="off"
                        value={form.reference}
                        onChange={(e) => set("reference", form.method === "MPESA" ? e.target.value.toUpperCase() : e.target.value)}
                        error={errors.reference}
                        placeholder={form.method === "MPESA" ? "e.g. SHK7Y2M4XR" : ""}
                        hint="Each reference can only be recorded once."
                    />
                )}
            </form>
        </Modal>
    );
}
