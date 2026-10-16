import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "./apiError";

/**
 * Loads data for a view and tracks loading/error, replacing the
 * try/catch/setLoading block every tab used to repeat.
 *
 * `load` must be stable (wrap it in useCallback with its real dependencies);
 * it is re-run whenever it changes (e.g. a filter). It should resolve to the
 * value to display (usually ApiResponse.data).
 *
 *   const load = useCallback(() => patientService.getMyBills().then(r => r.data), []);
 *   const { data, loading, error, reload, setData } = useLoader(load);
 *
 * `loading` is derived from whether the current data came from the current
 * `load`, so a changed filter shows a loading state without a synchronous
 * setState inside the effect.
 */
export default function useLoader(load, { initialData = null } = {}) {
    const [state, setState] = useState({ data: initialData, error: null, loadedFor: null, refreshing: false });

    useEffect(() => {
        let cancelled = false;
        load().then(
            (data) => { if (!cancelled) setState({ data, error: null, loadedFor: load, refreshing: false }); },
            (err) => { if (!cancelled) setState((s) => ({ ...s, error: getErrorMessage(err), loadedFor: load, refreshing: false })); },
        );
        return () => { cancelled = true; };
    }, [load]);

    const reload = useCallback(async () => {
        setState((s) => ({ ...s, refreshing: true, error: null }));
        try {
            const data = await load();
            setState({ data, error: null, loadedFor: load, refreshing: false });
        } catch (err) {
            setState((s) => ({ ...s, error: getErrorMessage(err), loadedFor: load, refreshing: false }));
        }
    }, [load]);

    const setData = useCallback((updater) => {
        setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
    }, []);

    const loading = state.loadedFor !== load || state.refreshing;
    return { data: state.data, error: loading ? null : state.error, loading, reload, setData };
}
