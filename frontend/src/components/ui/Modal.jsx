import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";
import Button from "./Button";

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog:
 * - role="dialog", aria-modal, labelled by its title
 * - moves focus into the dialog on open and returns it to the trigger on close
 * - keeps Tab/Shift+Tab inside the dialog
 * - Escape closes it (unless `busy`, so an in-flight request isn't abandoned)
 * - locks page scroll behind it
 */
export default function Modal({ title, description, onClose, children, footer, size = "md", busy = false }) {
    const titleId = useId();
    const descId = useId();
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const busyRef = useRef(busy);

    useEffect(() => {
        onCloseRef.current = onClose;
        busyRef.current = busy;
    });

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const panel = panelRef.current;
        const first = panel.querySelector("[data-autofocus]") || panel.querySelector(FOCUSABLE) || panel;
        first.focus();

        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";

        const onKeyDown = (e) => {
            if (e.key === "Escape" && !busyRef.current) {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key !== "Tab") return;
            const items = [...panel.querySelectorAll(FOCUSABLE)];
            if (items.length === 0) { e.preventDefault(); return; }
            const firstItem = items[0];
            const lastItem = items[items.length - 1];
            if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
            else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
        };
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = overflow;
            if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
        };
    }, []);

    const width = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                className={`flex max-h-[92vh] w-full ${width} flex-col rounded-t-card bg-white shadow-overlay sm:rounded-card`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>
                        {description && <p id={descId} className="mt-0.5 text-sm text-slate-600">{description}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-control p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                        aria-label="Close dialog"
                    >
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-4">{children}</div>
                {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
            </div>
        </div>
    );
}

/** Confirmation for consequential actions (cancel, disable, change role...). */
export function ConfirmDialog({ title, message, confirmLabel = "Confirm", tone = "primary", loading = false, onConfirm, onCancel }) {
    return (
        <Modal
            title={title}
            onClose={onCancel}
            size="sm"
            busy={loading}
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel} disabled={loading} data-autofocus>Go back</Button>
                    <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading} loadingText="Working">
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="text-sm text-slate-700">{message}</div>
        </Modal>
    );
}
