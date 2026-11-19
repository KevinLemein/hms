import { useEffect, useId, useState } from "react";
import patientService from "../../api/patientService";
import { getErrorMessage } from "../../lib/apiError";
import Icon from "../../components/ui/Icon";
import { Spinner } from "../../components/ui/Spinner";

const MIN_CHARS = 2;

/**
 * Patient search combobox (WAI-ARIA combobox + listbox pattern).
 * Searches the server (/patients/search) instead of filtering the first page
 * of patients in the browser, so every registered patient can be found.
 */
export default function PatientPicker({ selected, onSelect, error: fieldError }) {
    const id = useId();
    const listId = `${id}-list`;
    const [query, setQuery] = useState("");
    const [result, setResult] = useState({ query: "", patients: [], error: null });
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);

    const term = query.trim();
    const searching = term.length >= MIN_CHARS && result.query !== term;
    const patients = result.query === term ? result.patients : [];

    useEffect(() => {
        if (term.length < MIN_CHARS) return undefined;
        const timer = setTimeout(async () => {
            try {
                const res = await patientService.searchPatients(term);
                setResult({ query: term, patients: res.data || [], error: null });
            } catch (err) {
                setResult({ query: term, patients: [], error: getErrorMessage(err) });
            }
            setActive(-1);
        }, 300);
        return () => clearTimeout(timer);
    }, [term]);

    const choose = (p) => {
        onSelect(p);
        setQuery("");
        setOpen(false);
    };

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, patients.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
        else if (e.key === "Enter" && open && active >= 0 && patients[active]) { e.preventDefault(); choose(patients[active]); }
        else if (e.key === "Escape") { setOpen(false); }
    };

    if (selected) {
        return (
            <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">Patient</p>
                <div className="flex items-center justify-between gap-3 rounded-control border border-brand-200 bg-brand-50 px-3 py-2.5">
                    <div className="text-sm">
                        <p className="font-medium text-slate-900">{selected.firstName} {selected.lastName}</p>
                        <p className="text-slate-600">{selected.phoneNumber} · {selected.email}</p>
                    </div>
                    <button type="button" onClick={() => onSelect(null)} className="rounded-control px-2 py-1 text-sm font-medium text-brand-800 hover:bg-brand-100">
                        Change<span className="sr-only"> patient</span>
                    </button>
                </div>
            </div>
        );
    }

    const showList = open && term.length >= MIN_CHARS;

    return (
        <div className="relative">
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
                Patient<span className="text-red-700" aria-hidden="true"> *</span>
            </label>
            <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                    id={id}
                    type="text"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={`${id}-help`}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={onKeyDown}
                    placeholder="Name, email or phone"
                    autoComplete="off"
                    className={`w-full rounded-control border bg-white py-2.5 pl-9 pr-9 text-sm placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 ${fieldError ? "border-red-600" : "border-slate-300"}`}
                />
                {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><Spinner label="Searching" className="h-4 w-4" /></span>}
            </div>
            <p id={`${id}-help`} className={`mt-1 text-xs ${fieldError ? "font-medium text-red-700" : "text-slate-600"}`}>
                {fieldError || `Type at least ${MIN_CHARS} characters to search registered patients.`}
            </p>

            {showList && (
                <ul id={listId} role="listbox" aria-label="Matching patients"
                    className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-control border border-slate-200 bg-white shadow-overlay">
                    {searching ? (
                        <li className="px-3 py-2.5 text-sm text-slate-600">Searching…</li>
                    ) : result.error ? (
                        <li className="px-3 py-2.5 text-sm text-red-700">{result.error}</li>
                    ) : patients.length === 0 ? (
                        <li className="px-3 py-2.5 text-sm text-slate-600">No patients match “{term}”.</li>
                    ) : (
                        patients.map((p, i) => (
                            <li
                                key={p.id}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === active}
                                onMouseDown={(e) => { e.preventDefault(); choose(p); }}
                                className={`cursor-pointer px-3 py-2.5 text-sm ${i === active ? "bg-brand-50" : "hover:bg-slate-50"}`}
                            >
                                <span className="font-medium text-slate-900">{p.firstName} {p.lastName}</span>
                                <span className="block text-slate-600">{p.phoneNumber} · {p.email}</span>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
