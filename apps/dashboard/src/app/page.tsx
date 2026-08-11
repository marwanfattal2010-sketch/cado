import { redirect } from "next/navigation";
import { getDashboardUser } from "@/lib/auth";

/** Send people to the right home based on their role. */
export default async function Home() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");
  redirect(user.role === "admin" ? "/admin" : "/store");
}
