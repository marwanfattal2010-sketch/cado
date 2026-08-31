import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** The Exit link in the view-as banner. A GET, because it is a link. */
export async function GET() {
  const jar = await cookies();
  jar.delete("cado_view_as_partner");
  redirect("/admin/stores");
}
