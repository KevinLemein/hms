import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import adminService from "../api/adminService";
import useLoader from "../lib/useLoader";
import { getErrorMessage } from "../lib/apiError";
import { fullName } from "../lib/format";
import { statusLabel } from "../lib/statuses";
import AppShell from "../components/AppShell";
import { Card, CardHeader, PageHeader } from "../components/ui/Card";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import Pagination from "../components/ui/Pagination";
import StatusBadge from "../components/ui/StatusBadge";
import Button from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/Modal";
import { LoadError } from "../components/ui/Alert";
import { SkeletonRows } from "../components/ui/Spinner";
import { FilterGroup } from "../components/ui/Tabs";
import CreateUserDialog from "../features/admin/CreateUserDialog";

const ROLES = ["ROLE_ADMIN", "ROLE_DOCTOR", "ROLE_RECEPTIONIST", "ROLE_PATIENT"];
const FILTERS = [{ value: "ALL", label: "All" }, ...ROLES.map((r) => ({ value: r, label: statusLabel("role", r) }))];

export default function AdminDashboard() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [filter, setFilter] = useState("ALL");
    const [page, setPage] = useState(0);
    const [creating, setCreating] = useState(false);
    const [confirm, setConfirm] = useState(null); // { kind: "role" | "status", user, role? }
    const [working, setWorking] = useState(false);

    // "All" is paged on the server; a role filter uses /admin/users/role/{role},
    // so filtering covers every user, not just the first page.
    const load = useCallback(async () => {
        if (filter === "ALL") return (await adminService.getAllUsers(page)).data;
        const res = await adminService.getUsersByRole(filter);
        return { content: res.data, page: 0, totalPages: 1, totalElements: res.data.length };
    }, [filter, page]);
    const { data, loading, error, reload, setData } = useLoader(load);
    const users = data?.content || [];

    const replaceUser = (u) => setData((d) => ({ ...d, content: d.content.map((x) => (x.id === u.id ? u : x)) }));

    const runConfirmed = async () => {
        setWorking(true);
        try {
            const res = confirm.kind === "role"
                ? await adminService.updateUserRole(confirm.user.id, confirm.role)
                : await adminService.toggleUserStatus(confirm.user.id);
            replaceUser(res.data);
            showSuccess(confirm.kind === "role"
                ? `${fullName(res.data.firstName, res.data.lastName)} is now ${statusLabel("role", res.data.role)}`
                : `${fullName(res.data.firstName, res.data.lastName)}'s account is ${res.data.enabled ? "enabled" : "disabled"}`);
        } catch (err) {
            showError(getErrorMessage(err, "The change couldn't be saved."));
        } finally {
            setWorking(false);
            setConfirm(null);
        }
    };

    const isSelf = (u) => u.id === user.id;

    return (
        <AppShell>
            <PageHeader
                title="User management"
                description="Create staff accounts, change roles and enable or disable access."
                actions={<Button icon="userPlus" onClick={() => setCreating(true)}>Create staff account</Button>}
            />

            <Card aria-busy={loading}>
                <CardHeader
                    title="Users"
                    description={loading ? "Loading…" : `${data?.totalElements ?? users.length} ${filter === "ALL" ? "accounts" : statusLabel("role", filter).toLowerCase() + " accounts"}`}
                    actions={<FilterGroup label="Filter by role" options={FILTERS} value={filter} onChange={(v) => { setFilter(v); setPage(0); }} />}
                />
                {loading ? (
                    <SkeletonRows label="Loading users" />
                ) : error ? (
                    <LoadError message={error} onRetry={reload} />
                ) : users.length === 0 ? (
                    <EmptyState icon="users" title="No users" description="No accounts match this filter." />
                ) : (
                    <>
                        <DataTable
                            caption="Users"
                            rows={users}
                            columns={[
                                {
                                    key: "user",
                                    header: "User",
                                    render: (u) => (
                                        <>
                                            <span className="font-medium text-slate-900">{fullName(u.firstName, u.lastName)}</span>
                                            {isSelf(u) && <span className="ml-1.5 text-xs text-slate-600">(you)</span>}
                                            <span className="block text-xs text-slate-600">@{u.username}</span>
                                        </>
                                    ),
                                },
                                { key: "email", header: "Email", render: (u) => u.email },
                                {
                                    key: "role",
                                    header: "Role",
                                    render: (u) => (
                                        <>
                                            <label htmlFor={`role-${u.id}`} className="sr-only">Role for {fullName(u.firstName, u.lastName)}</label>
                                            <select
                                                id={`role-${u.id}`}
                                                value={u.role}
                                                disabled={isSelf(u)}
                                                title={isSelf(u) ? "You can't change your own role" : undefined}
                                                onChange={(e) => setConfirm({ kind: "role", user: u, role: e.target.value })}
                                                className="rounded-control border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:bg-slate-100"
                                            >
                                                {ROLES.map((r) => <option key={r} value={r}>{statusLabel("role", r)}</option>)}
                                            </select>
                                        </>
                                    ),
                                },
                                { key: "status", header: "Status", render: (u) => <StatusBadge kind="account" value={u.enabled} /> },
                                {
                                    key: "actions",
                                    header: "Actions",
                                    render: (u) => isSelf(u) ? <span className="text-slate-500">—</span> : (
                                        <Button
                                            size="sm"
                                            variant={u.enabled ? "dangerOutline" : "secondary"}
                                            onClick={() => setConfirm({ kind: "status", user: u })}
                                            aria-label={`${u.enabled ? "Disable" : "Enable"} ${fullName(u.firstName, u.lastName)}`}
                                        >
                                            {u.enabled ? "Disable" : "Enable"}
                                        </Button>
                                    ),
                                },
                            ]}
                        />
                        {filter === "ALL" && (
                            <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onChange={setPage} disabled={loading} />
                        )}
                    </>
                )}
            </Card>

            {creating && (
                <CreateUserDialog
                    allowedRoles={["ROLE_DOCTOR", "ROLE_RECEPTIONIST", "ROLE_ADMIN"]}
                    apiCall={adminService.createUser}
                    onClose={() => setCreating(false)}
                    onCreated={(u) => {
                        setCreating(false);
                        showSuccess(`Account created for ${fullName(u.firstName, u.lastName)}`);
                        reload();
                    }}
                />
            )}

            {confirm && (
                <ConfirmDialog
                    title={confirm.kind === "role"
                        ? `Change role to ${statusLabel("role", confirm.role)}?`
                        : `${confirm.user.enabled ? "Disable" : "Enable"} this account?`}
                    message={confirm.kind === "role" ? (
                        <>
                            <p>{fullName(confirm.user.firstName, confirm.user.lastName)} will change from {statusLabel("role", confirm.user.role)} to {statusLabel("role", confirm.role)} and will see that role's screens from their next request.</p>
                            {confirm.role === "ROLE_PATIENT" && (
                                <p className="mt-2 text-amber-900">Patient accounts need a patient record created by reception; changing a staff account to Patient won't create one.</p>
                            )}
                        </>
                    ) : confirm.user.enabled
                        ? `${fullName(confirm.user.firstName, confirm.user.lastName)} will be signed out and won't be able to sign in until the account is enabled again.`
                        : `${fullName(confirm.user.firstName, confirm.user.lastName)} will be able to sign in again.`}
                    confirmLabel={confirm.kind === "role" ? "Change role" : confirm.user.enabled ? "Disable account" : "Enable account"}
                    tone={confirm.kind === "status" && confirm.user.enabled ? "danger" : "primary"}
                    loading={working}
                    onConfirm={runConfirmed}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </AppShell>
    );
}
