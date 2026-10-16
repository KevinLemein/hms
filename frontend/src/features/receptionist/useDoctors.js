import { useCallback } from "react";
import receptionistService from "../../api/receptionistService";
import useLoader from "../../lib/useLoader";

/** Doctor accounts for booking forms, as select options. */
export default function useDoctors() {
    const load = useCallback(() => receptionistService.getDoctors().then((r) => r.data), []);
    const { data, loading, error } = useLoader(load, { initialData: [] });
    const options = (data || [])
        .filter((d) => d.enabled !== false)
        .map((d) => ({ value: String(d.id), label: `Dr. ${d.firstName} ${d.lastName}` }));
    return { options, loading, error };
}
