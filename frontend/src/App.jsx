import {BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";

import {AuthProvider} from "./context/AuthContext.jsx"
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Unauthorised from "./pages/Unauthorised";
import AdminDashboard from "./pages/AdminDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import ReceptionistDashboard from "./pages/ReceptionistDashboard";
import PatientDashboard from "./pages/PatientDashboard"

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Public routes*/}

                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/unauthorised" element={<Unauthorised />} />

                    {/* Private routes*/}

                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /> </ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute allowedRoles = {["ROLE_ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/doctor" element={<ProtectedRoute allowedRoles = {["ROLE_DOCTOR"]}><DoctorDashboard /></ProtectedRoute>} />
                    <Route path="/receptionist" element={<ProtectedRoute allowedRoles = {["ROLE_RECEPTIONIST"]}><ReceptionistDashboard /></ProtectedRoute>} />
                    <Route path="/patient" element={<ProtectedRoute allowedRoles = {["ROLE_PATIENT"]}><PatientDashboard /></ProtectedRoute>} />


                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </Router>
    )
}

export default App;

