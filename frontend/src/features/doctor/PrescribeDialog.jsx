import { useState } from "react";
import prescriptionService from "../../api/prescriptionService";
import { getErrorMessage, getFieldErrors } from "../../lib/apiError";
import { formatDateTime, formatMoney, fullName } from "../../lib/format";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { SelectField, TextAreaField, TextField } from "../../components/ui/Field";

/**
 * Prescribe = dispense in this clinic: saving deducts stock and adds the
 * medication to the appointment's bill. The request carries no price; the
 * server prices it from the drug catalogue. The estimate shown here is for
 * the doctor's information only.
 */
export default function PrescribeDialog({ appointment, drugs, onClose, onSaved }) {
    const [form, setForm] = useState({ drugId: "", dosage: "", duration: "", quantity: "1", notes: "" });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const set = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setErrors({ ...errors, [e.target.name]: undefined }); setFormError(""); };
    const drug = drugs.find((d) => String(d.id) === form.drugId);
    const priced = drug && Number(drug.cost) > 0;
    const qty = Number(form.quantity);

    const submit = async (e) => {
        e.preventDefault();
        const next = {};
        if (!form.drugId) next.drugId = "Choose a medication.";
        if (!form.dosage.trim()) next.dossage = "Enter the dosage.";
        if (!form.duration.trim()) next.duration = "Enter the duration.";
        if (!(qty >= 1) || !Number.isInteger(qty)) next.quantity = "Quantity must be a whole number of at least 1.";
        else if (drug && qty > drug.quantity) next.quantity = `Only ${drug.quantity} in stock.`;
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        try {
            const res = await prescriptionService.create({
                appointmentId: appointment.id,
                drugId: Number(form.drugId),
                dossage: form.dosage.trim(),
                duration: form.duration.trim(),
                notes: form.notes.trim(),
                quantity: qty,
            });
            onSaved(res);
        } catch (err) {
            // e.g. 409 insufficient stock / no price / already prescribed with different details
            setErrors(getFieldErrors(err));
            setFormError(getErrorMessage(err, "The prescription couldn't be saved."));
            setSaving(false);
        }
    };

    const drugOptions = drugs.map((d) => ({
        value: String(d.id),
        label: `${d.name}${d.milligrams ? ` ${d.milligrams} mg` : ""} — ${d.quantity} in stock${Number(d.cost) > 0 ? "" : " (no price set)"}`,
        disabled: d.quantity < 1 || !(Number(d.cost) > 0),
    }));

    return (
        <Modal
            title="Prescribe medication"
            description={`${fullName(appointment.patientFirstName, appointment.patientLastName)} · ${formatDateTime(appointment.appointmentDateTime)}`}
            onClose={onClose}
            busy={saving}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" form="prescribe-form" loading={saving} loadingText="Saving" icon="pill">Prescribe and dispense</Button>
                </>
            }
        >
            <form id="prescribe-form" onSubmit={submit} noValidate className="space-y-4">
                {formError && <Alert tone="error">{formError}</Alert>}
                {drugs.length === 0 && <Alert tone="warning">No medication is available in the catalogue.</Alert>}

                <SelectField
                    label="Medication"
                    name="drugId"
                    required
                    value={form.drugId}
                    onChange={set}
                    error={errors.drugId}
                    placeholder="Choose a medication"
                    options={drugOptions}
                    hint="Out-of-stock and unpriced items can't be dispensed."
                    data-autofocus
                />
                <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Dosage" name="dosage" required value={form.dosage} onChange={set} error={errors.dossage} placeholder="e.g. 2 tablets" />
                    <TextField label="Duration" name="duration" required value={form.duration} onChange={set} error={errors.duration} placeholder="e.g. 3 times a day for 7 days" />
                </div>
                <TextField
                    label="Quantity to dispense"
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    max={drug?.quantity}
                    required
                    value={form.quantity}
                    onChange={set}
                    error={errors.quantity}
                    hint={drug ? `${drug.quantity} in stock. Deducted from stock when you save.` : "Deducted from stock when you save."}
                />
                <TextAreaField label="Notes for the patient (optional)" name="notes" value={form.notes} onChange={set} placeholder="e.g. Take after meals" />

                {priced && qty >= 1 && (
                    <p className="rounded-control bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Estimated charge: <span className="font-semibold">{formatMoney(Number(drug.cost) * qty)}</span>{" "}
                        <span className="text-slate-600">({formatMoney(drug.cost)} each, from the drug catalogue). It is added to this visit's bill.</span>
                    </p>
                )}
            </form>
        </Modal>
    );
}
