import { useAuth } from "../../lib/auth";

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin dashboard</h1>
        <button onClick={signOut} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
          Log out
        </button>
      </div>
      <p className="text-gray-500">Welcome, {profile?.full_name || "admin"}.</p>
      <p className="mt-1 text-sm text-gray-400">
        Partner approvals, categories, and occasions management land in Stage 7.
      </p>
    </div>
  );
}
