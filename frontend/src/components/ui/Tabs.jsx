import { useId, useRef } from "react";
import Icon from "./Icon";

/**
 * WAI-ARIA tabs: role=tablist/tab/tabpanel, aria-selected, roving tabindex,
 * Left/Right/Home/End to move between tabs. Only the active panel is rendered.
 *
 * tabs: [{ key, label, icon? }]
 */
export default function Tabs({ tabs, active, onChange, label, children }) {
    const baseId = useId();
    const refs = useRef({});
    const tabId = (key) => `${baseId}-tab-${key}`;
    const panelId = (key) => `${baseId}-panel-${key}`;

    const onKeyDown = (e) => {
        const i = tabs.findIndex((t) => t.key === active);
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        onChange(next.key);
        refs.current[next.key]?.focus();
    };

    return (
        <div>
            <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex min-w-max gap-1 border-b border-slate-200">
                    {tabs.map((t) => {
                        const selected = t.key === active;
                        return (
                            <button
                                key={t.key}
                                ref={(el) => { refs.current[t.key] = el; }}
                                id={tabId(t.key)}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                aria-controls={panelId(t.key)}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => onChange(t.key)}
                                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                                    selected
                                        ? "border-brand-700 text-brand-800"
                                        : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800"
                                }`}
                            >
                                {t.icon && <Icon name={t.icon} className="h-4 w-4" />}
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div role="tabpanel" id={panelId(active)} aria-labelledby={tabId(active)} tabIndex={0} className="focus-visible:outline-offset-4">
                {children}
            </div>
        </div>
    );
}

/** Compact filter buttons (not tabs: they filter one list). Exposed as a toggle group. */
export function FilterGroup({ options, value, onChange, label }) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    aria-pressed={o.value === value}
                    onClick={() => onChange(o.value)}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                        o.value === value
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
