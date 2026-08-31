import { requireStoreOwner } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { t } from "@/lib/dictionary";
import { PageHeader } from "@/components/ui";
import { ProfileForm, type StoreProfileValues } from "./ProfileForm";

export const dynamic = "force-dynamic";

/**
 * §5.5 STORE PROFILE — what a customer sees, in the shop owner's hands.
 *
 * Scoped with an explicit .eq("id", user.partnerId) even though
 * "public reads active partners" would already narrow it: that policy is
 * (status = 'active' OR is_admin() OR id = my_partner_id()), which is
 * deliberately wide enough to serve anonymous shoppers on cado-web. An
 * unfiltered select here would return every active store on CADO.
 */
export default async function StoreProfilePage() {
  const user = await requireStoreOwner();
  const supabase = await createServerClient();

  const { data: partner } = await supabase
    .from("partners")
    .select(
      "id, name, slug, tagline, description, city, logo_url, cover_image_url, offers_gift_wrap, pickup_address, driver_contact, status, is_live"
    )
    .eq("id", user.partnerId)
    .single();

  if (!partner) {
    return (
      <div>
        <PageHeader title={t("profile.title")} />
        <p className="text-sm text-muted">{t("common.error")}</p>
      </div>
    );
  }

  const values: StoreProfileValues = {
    name: partner.name,
    tagline: partner.tagline,
    description: partner.description,
    city: partner.city,
    logo_url: partner.logo_url,
    cover_image_url: partner.cover_image_url,
    offers_gift_wrap: partner.offers_gift_wrap,
    pickup_address: partner.pickup_address,
    driver_contact: partner.driver_contact,
  };

  /*
   * The REAL storefront route, read off apps/web/src/App.tsx:
   *   <Route path="store/:slug" element={<Store />} />
   * so the public page is <storefront>/store/<slug> — not /stores/, not
   * /partner/, and not an id.
   */
  const storeUrl = `${publicEnv.NEXT_PUBLIC_STOREFRONT_URL}/store/${partner.slug}`;

  return (
    <div className="pb-4">
      <PageHeader title={t("profile.title")} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-ribbon-tint p-4">
        <p className="text-sm text-ink">{t("profile.subtitle")}</p>
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm font-semibold text-ribbon underline underline-offset-4"
        >
          {t("profile.viewstore")}
        </a>
      </div>

      <ProfileForm values={values} />
    </div>
  );
}
