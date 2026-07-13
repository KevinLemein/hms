import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((t) => t.id !== id));
    }, []);

    const show = useCallback((message, type = "error", duration = 5000) => {
        const id = nextId++;
        setToasts((current) => [...current, { id, message, type }]);
        if (duration) {
            setTimeout(() => dismiss(id), duration);
        }
        return id;
    }, [dismiss]);

    const showError = useCallback((message) => show(message || "Something went wrong. Please try again.", "error"), [show]);
    const showSuccess = useCallback((message) => show(message, "success"), [show]);

    return (
        <ToastContext.Provider value={{ showError, showSuccess, dismiss }}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role="alert"
                        className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm animate-in fade-in slide-in-from-top-2 ${
                            toast.type === "success"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-red-50 border-red-200 text-red-800"
                        }`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {toast.type === "success" ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                        </svg>
                        <p className="flex-1">{toast.message}</p>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className="flex-shrink-0 opacity-60 hover:opacity-100"
                            aria-label="Dismiss"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}