import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PageSpinner } from "./ui/Spinner";

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, isAuthenticated, loading, sessionExpired } = useAuth();

    if (loading) {
        return <PageSpinner label="Checking your session" />;
    }

    if (!isAuthenticated) {
        // Not passing `from` here anymore -- Login.jsx always sends a user
        // to their own role's dashboard after login (see Login.jsx for why).
        // Carry the session-expired flag (see AuthContext for why it's needed here).
        return <Navigate to="/login" replace state={sessionExpired ? { sessionExpired: true } : undefined} />;
    }

    // If specific roles are required, check them
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}
