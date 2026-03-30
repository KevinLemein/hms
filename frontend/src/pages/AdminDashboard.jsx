import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import adminService from "../api/adminService";

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filterRole, setFilterRole] = useState("ALL");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await adminService.getAllUsers();
            if (response.success) {
                setUsers(response.data);
            }
        } catch (err) {
            setError("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const handleToggleStatus = async (userId) => {
        try {
            const response = await adminService.toggleUserStatus(userId);
            if (response.success) {
                setUsers(users.map((u) => (u.id === userId ? response.data : u)));
                setSuccess("User status updated");
                setTimeout(() => setSuccess(""), 3000);
            }
        } catch (err) {
            setError("Failed to update user status");
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await adminService.updateUserRole(userId, newRole);
            if (response.success) {
                setUsers(users.map((u) => (u.id === userId ? response.data : u)));
                setSuccess("Role updated successfully");
                setTimeout(() => setSuccess(""), 3000);
            }
        } catch (err) {
            setError("Failed to update role");
        }
    };

    const filteredUsers =
        filterRole === "ALL"
            ? users
            : users.filter((u) => u.role === filterRole);

    const roleColors = {
        ROLE_ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
        ROLE_DOCTOR: "bg-blue-100 text-blue-700 border-blue-200",
        ROLE_RECEPTIONIST: "bg-amber-100 text-amber-700 border-amber-200",
        ROLE_PATIENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };

    const roleLabels = {
        ROLE_ADMIN: "Admin",
        ROLE_DOCTOR: "Doctor",
        ROLE_RECEPTIONIST: "Receptionist",
        ROLE_PATIENT: "Patient",
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-slate-800">MediCare HMS</span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium border bg-purple-100 text-purple-700 border-purple-200">
              Admin Panel
            </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-slate-800">{user?.username}</p>
                            <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                        <p className="text-slate-500 mt-1">Create and manage system users</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create User
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
                        {success}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Total Users", count: users.length, color: "teal" },
                        { label: "Doctors", count: users.filter((u) => u.role === "ROLE_DOCTOR").length, color: "blue" },
                        { label: "Receptionists", count: users.filter((u) => u.role === "ROLE_RECEPTIONIST").length, color: "amber" },
                        { label: "Patients", count: users.filter((u) => u.role === "ROLE_PATIENT").length, color: "emerald" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                            <p className="text-sm text-slate-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">{stat.count}</p>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {["ALL", "ROLE_ADMIN", "ROLE_DOCTOR", "ROLE_RECEPTIONIST", "ROLE_PATIENT"].map((role) => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                filterRole === role
                                    ? "bg-teal-600 text-white"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {role === "ALL" ? "All" : roleLabels[role] || role}
                        </button>
                    ))}
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mx-auto" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No users found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">
                                                    {u.firstName} {u.lastName}
                                                </p>
                                                <p className="text-xs text-slate-500">@{u.username}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={u.role}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${roleColors[u.role]}`}
                                            >
                                                <option value="ROLE_ADMIN">Admin</option>
                                                <option value="ROLE_DOCTOR">Doctor</option>
                                                <option value="ROLE_RECEPTIONIST">Receptionist</option>
                                                <option value="ROLE_PATIENT">Patient</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                u.enabled
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                            }`}
                        >
                          {u.enabled ? "Active" : "Disabled"}
                        </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleStatus(u.id)}
                                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                                                    u.enabled
                                                        ? "text-red-600 hover:bg-red-50"
                                                        : "text-emerald-600 hover:bg-emerald-50"
                                                }`}
                                            >
                                                {u.enabled ? "Disable" : "Enable"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Create User Modal */}
            {showCreateModal && (
                <CreateUserModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={(newUser) => {
                        setUsers([...users, newUser]);
                        setShowCreateModal(false);
                        setSuccess("User created successfully");
                        setTimeout(() => setSuccess(""), 3000);
                    }}
                />
            )}
        </div>
    );
}

function CreateUserModal({ onClose, onCreated }) {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "ROLE_DOCTOR",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await adminService.createUser(formData);
            if (response.success) {
                onCreated(response.data);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Create New User</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name</label>
                            <input
                                name="firstName"
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
                            <input
                                name="lastName"
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                        <input
                            name="username"
                            type="text"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                        <input
                            name="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="ROLE_ADMIN">Admin</option>
                            <option value="ROLE_DOCTOR">Doctor</option>
                            <option value="ROLE_RECEPTIONIST">Receptionist</option>
                            <option value="ROLE_PATIENT">Patient</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Creating...
                            </>
                        ) : (
                            "Create User"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}