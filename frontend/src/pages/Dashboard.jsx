import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { roleRoutes } from "../utils/roleRoutes.jsx";

export default function Dashboard() {
    const { user } = useAuth();

    const destination = user?.role ? roleRoutes[user.role] : undefined;
    return <Navigate to={destination || "/login"} replace />;
}