import {BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";

import {AuthProvider} from "./context/AuthContext.jsx"
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Unauthorised from "./pages/Unauthorised";

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    {/* Public routes*/}

                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/unauthorised" element={<Unauthorised />} />

                    {/* Private routes*/}

                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /> </ProtectedRoute>} />

                    {/*
                        Role-specific routes — add these as you build features:

                        <Route
                          path="/patients/register"
                          element={
                            <ProtectedRoute allowedRoles={["ROLE_RECEPTIONIST"]}>
                              <RegisterPatient />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/appointments"
                          element={
                            <ProtectedRoute allowedRoles={["ROLE_DOCTOR", "ROLE_RECEPTIONIST"]}>
                              <Appointments />
                            </ProtectedRoute>
                          }
                        />
          */}
                </Routes>
            </AuthProvider>
        </Router>
    )
}

export default App;

