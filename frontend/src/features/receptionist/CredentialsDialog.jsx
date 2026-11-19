import { useState } from "react";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { DetailList } from "../../components/ui/Card";

/** Shown once after registration: the generated password is never shown again. */
export default function CredentialsDialog({ patient, bookingError, onClose }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        // window.location.origin instead of a hardcoded URL, so the login
        // link is right wherever the app is deployed.
        await navigator.clipboard.writeText(
            `MediCare login\nName: ${patient.firstName} ${patient.lastName}\nEmail: ${patient.email}\nPassword: ${patient.generatedPassword}\nSign in at: ${window.location.origin}/login`,
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal
            title="Patient registered"
            description="Give these sign-in details to the patient."
            onClose={onClose}
            footer={
                <>
                    <Button variant="secondary" onClick={handleCopy} icon={copied ? "check" : undefined}>
                        {copied ? "Copied" : "Copy details"}
                    </Button>
                    <Button onClick={onClose}>Done</Button>
                </>
            }
        >
            <div className="space-y-4">
                {bookingError && (
                    <Alert tone="warning" title="The appointment was not booked">
                        {bookingError} Book it from the “Book appointment” tab.
                    </Alert>
                )}
                <div className="rounded-control border border-slate-200 bg-slate-50 p-4">
                    <DetailList
                        columns="sm:grid-cols-2"
                        items={[
                            { label: "Name", value: `${patient.firstName} ${patient.lastName}` },
                            { label: "Email (sign-in)", value: patient.email },
                            { label: "Username", value: patient.username },
                            { label: "Temporary password", value: <span className="font-mono text-base font-semibold tracking-wider text-brand-800">{patient.generatedPassword}</span> },
                        ]}
                    />
                </div>
                <p className="text-sm text-amber-900">This password is shown only once and can't be retrieved later.</p>
                <p aria-live="polite" className="sr-only">{copied ? "Sign-in details copied to clipboard" : ""}</p>
            </div>
        </Modal>
    );
}
