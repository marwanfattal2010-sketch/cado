import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();
  const { data: partner } = await supabase
    .from("partners")
    .select("name")
    .eq("id", user.partnerId!)
    .single();

  return (
    <AppShell role="store_owner" storeName={partner?.name}>
      {children}
    </AppShell>
  );
}
