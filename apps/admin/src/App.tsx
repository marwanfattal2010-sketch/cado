import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Login from "./routes/login";
import PartnerDashboard from "./routes/partner/dashboard";
import AdminDashboard from "./routes/admin/dashboard";

function RoleGate({ role, children }: { role: "partner" | "admin"; children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return null;
  if (profile.role !== role) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/partner"} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { session, profile, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !loading && session && profile ? (
            <Navigate to={profile.role === "admin" ? "/admin" : "/partner"} replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/partner/*"
        element={
          <RoleGate role="partner">
            <PartnerDashboard />
          </RoleGate>
        }
      />
      <Route
        path="/admin/*"
        element={
          <RoleGate role="admin">
            <AdminDashboard />
          </RoleGate>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
