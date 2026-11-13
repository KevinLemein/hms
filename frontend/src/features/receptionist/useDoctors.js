import { useCallback } from "react";
import appointmentService from "../../api/appointmentService";
import useLoader from "../../lib/useLoader";

/** Enabled doctors for booking forms, as select options (any signed-in role). */
export default function useDoctors() {
    const load = useCallback(() => appointmentService.getDoctors().then((r) => r.data), []);
    const { data, loading, error } = useLoader(load, { initialData: [] });
    const options = (data || [])
        .filter((d) => d.enabled !== false)
        .map((d) => ({ value: String(d.id), label: `Dr. ${d.firstName} ${d.lastName}` }));
    return { options, loading, error };
}
