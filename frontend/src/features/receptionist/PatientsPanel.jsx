import { useCallback, useState } from "react";
import patientService from "../../api/patientService";
import useLoader from "../../lib/useLoader";
import { formatDate, fullName } from "../../lib/format";
import { Card, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import Pagination from "../../components/ui/Pagination";
import { LoadError } from "../../components/ui/Alert";
import { SkeletonRows } from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";

/** Paged patient list with server-side search. */
export default function PatientsPanel() {
    const [page, setPage] = useState(0);
    const [input, setInput] = useState("");
    const [query, setQuery] = useState("");

    const load = useCallback(async () => {
        if (query) {
            const res = await patientService.searchPatients(query);
            return { content: res.data, totalPages: 1, page: 0, totalElements: res.data.length };
        }
        return (await patientService.getAllPatients(page)).data;
    }, [page, query]);
    const { data, loading, error, reload } = useLoader(load);

    const submit = (e) => {
        e.preventDefault();
        setPage(0);
        setQuery(input.trim());
    };
    const clear = () => { setInput(""); setQuery(""); setPage(0); };
    const rows = data?.content || [];

    return (
        <Card aria-busy={loading}>
            <CardHeader title="Patients" description={query ? `Results for “${query}”` : "All registered patients"} />
            <form role="search" onSubmit={submit} className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
                <label htmlFor="patient-search" className="sr-only">Search patients</label>
                <div className="relative min-w-0 flex-1">
                    <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        id="patient-search"
                        type="search"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search by name, email or phone"
                        className="w-full rounded-control border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                </div>
                <Button type="submit" size="sm">Search</Button>
                {query && <Button size="sm" variant="secondary" onClick={clear}>Clear</Button>}
            </form>

            {loading ? (
                <SkeletonRows label="Loading patients" />
            ) : error ? (
                <LoadError message={error} onRetry={reload} />
            ) : rows.length === 0 ? (
                <EmptyState icon="users" title={query ? "No matching patients" : "No patients registered yet"}
                            description={query ? "Check the spelling, or search by phone number." : "Use “Register patient” to add one."} />
            ) : (
                <>
                    <DataTable
                        caption="Patients"
                        rows={rows}
                        columns={[
                            {
                                key: "name",
                                header: "Patient",
                                render: (p) => (
                                    <>
                                        <span className="font-medium text-slate-900">{fullName(p.firstName, p.lastName)}</span>
                                        <span className="block text-xs text-slate-600">{p.email}</span>
                                    </>
                                ),
                            },
                            { key: "phone", header: "Phone", render: (p) => p.phoneNumber },
                            { key: "dob", header: "Date of birth", render: (p) => formatDate(p.dateOfBirth) },
                            { key: "gender", header: "Gender", render: (p) => p.gender && p.gender.charAt(0) + p.gender.slice(1).toLowerCase() },
                            { key: "address", header: "Address", hideOnMobile: true, render: (p) => p.address },
                            {
                                key: "allergies",
                                header: "Allergies",
                                render: (p) => (p.allergies ? <span className="font-medium text-red-700">{p.allergies}</span> : "—"),
                            },
                        ]}
                    />
                    {!query && (
                        <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} disabled={loading} />
                    )}
                </>
            )}
        </Card>
    );
}
