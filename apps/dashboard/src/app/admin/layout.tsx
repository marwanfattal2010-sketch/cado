import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AppShell role="admin" userName={user.fullName} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
