import { useState } from "react";
import { getErrorMessage, getFieldErrors } from "../../lib/apiError";
import { statusLabel } from "../../lib/statuses";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { SelectField, TextField } from "../../components/ui/Field";

/** Creates a staff account. Patients are registered by reception, not here. */
export default function CreateUserDialog({ allowedRoles, apiCall, onClose, onCreated }) {
    const [form, setForm] = useState({ firstName: "", lastName: "", username: "", email: "", password: "", role: allowedRoles[0] });
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const set = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setErrors({ ...errors, [e.target.name]: undefined }); };

    const submit = async (e) => {
        e.preventDefault();
        const next = {};
        if (!form.firstName.trim()) next.firstName = "First name is required.";
        if (!form.lastName.trim()) next.lastName = "Last name is required.";
        if (form.username.trim().length < 3) next.username = "Username must be at least 3 characters.";
        if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
        if (form.password.length < 6) next.password = "Password must be at least 6 characters.";
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        setFormError("");
        try {
            const res = await apiCall(form);
            onCreated(res.data);
        } catch (err) {
            setErrors(getFieldErrors(err));
            setFormError(getErrorMessage(err, "The account couldn't be created."));
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Create staff account"
            onClose={onClose}
            busy={saving}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button type="submit" form="create-user-form" loading={saving} loadingText="Creating" icon="userPlus">Create account</Button>
                </>
            }
        >
            <form id="create-user-form" onSubmit={submit} noValidate className="space-y-4">
                {formError && <Alert tone="error">{formError}</Alert>}
                <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="First name" name="firstName" required autoComplete="off" value={form.firstName} onChange={set} error={errors.firstName} data-autofocus />
                    <TextField label="Last name" name="lastName" required autoComplete="off" value={form.lastName} onChange={set} error={errors.lastName} />
                </div>
                <TextField label="Username" name="username" required autoComplete="off" value={form.username} onChange={set} error={errors.username} />
                <TextField label="Email" name="email" type="email" required autoComplete="off" value={form.email} onChange={set} error={errors.email} />
                <TextField label="Temporary password" name="password" type="password" required autoComplete="new-password" value={form.password} onChange={set} error={errors.password} hint="At least 6 characters. Share it with the user securely." />
                <SelectField label="Role" name="role" required value={form.role} onChange={set} error={errors.role}
                             options={allowedRoles.map((r) => ({ value: r, label: statusLabel("role", r) }))} />
            </form>
        </Modal>
    );
}
