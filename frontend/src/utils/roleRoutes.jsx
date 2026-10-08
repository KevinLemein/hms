export const roleRoutes = {
    ROLE_ADMIN: "/admin",
    ROLE_DOCTOR: "/doctor",
    ROLE_RECEPTIONIST: "/receptionist",
    ROLE_PATIENT: "/patient",
};

export function dashboardPathForRole(role) {
    return roleRoutes[role] || "/dashboard";
}