import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
    const { user } = useAuth();

    switch (user?.role) {
        case "ROLE_ADMIN":
            return <Navigate to="/admin" replace />;
        case "ROLE_DOCTOR":
            return <Navigate to="/doctor" replace />;
        case "ROLE_RECEPTIONIST":
            return <Navigate to="/receptionist" replace />;
        case "ROLE_PATIENT":
            return <Navigate to="/patient" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
}