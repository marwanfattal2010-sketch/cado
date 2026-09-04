import "server-only";
import { createServerClient } from "@/lib/supabase/server";

/**
 * PUTTING A SHOP'S LOGO IN THE BUCKET, once, for both callers.
 *
 * A store owner does this from their own account page and an admin does it on
 * a shop's behalf from the store detail page. Both land here, and both run as
 * THEIR OWN SESSION — never the service role. That matters: the storage
 * policies added in 0098 are what decide whether a write is allowed (a partner
 * inside its own folder, an admin anywhere in the bucket), and routing around
 * them with an elevated key would move the security boundary into this file,
 * where it would have to be re-checked by hand every time someone edits it.
 *
 * The caller is responsible for having established WHO is asking
 * (`requireStoreOwner` / `requireAdmin`) and which partner they may touch.
 */

const BUCKET = "partner-logos";

/** What the bucket accepts, minus SVG — see the note in `upload`. */
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * 2MB, not the bucket's 5. A logo is a few hundred kilobytes; anything past a
 * megabyte or two is a photograph someone has mistaken for a logo, and it is
 * kinder to say so than to serve it to every shopper on the tab.
 */
const MAX_BYTES = 2 * 1024 * 1024;

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type LogoResult = { ok: boolean; message: string };

export async function uploadPartnerLogo(partnerId: string, file: File): Promise<LogoResult> {
  if (!file || file.size === 0) return { ok: false, message: "Choose a file first." };

  /*
   * SVG IS DELIBERATELY NOT ACCEPTED, even though it is the natural format for
   * a logo. An SVG is a document: it can carry <script>, and it is served from
   * the same Supabase origin the storefront already trusts for images. The
   * bucket's own MIME allow-list excludes it too, so this check is agreeing
   * with the bucket rather than inventing a rule.
   */
  if (!ALLOWED.has(file.type)) {
    return { ok: false, message: "Use a PNG, JPG, WEBP or GIF file." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "That file is over 2MB. Please upload a smaller logo." };
  }

  const supabase = await createServerClient();

  /*
   * A NEW FILENAME EVERY TIME, rather than overwriting `logo.png`.
   *
   * The bucket is public and served through a CDN, so replacing a file at the
   * same path leaves shoppers looking at the old logo until the cache expires
   * — which is exactly the moment a shop is most likely to be looking. A fresh
   * name changes the URL, so the new logo is visible immediately.
   */
  const path = `${partnerId}/logo-${Date.now()}.${EXT[file.type]}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, message: `Upload failed: ${uploadError.message}` };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Read the old URL before overwriting it, so the previous file can be tidied
  // up afterwards rather than orphaned in the bucket forever.
  const { data: before } = await supabase
    .from("partners")
    .select("logo_url")
    .eq("id", partnerId)
    .single();

  const { error: rowError } = await supabase
    .from("partners")
    .update({ logo_url: publicUrl })
    .eq("id", partnerId);

  if (rowError) {
    // The row is the thing that matters; a file nobody points at is litter,
    // not a bug, so clean it up and report the real failure.
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, message: `Could not save the logo: ${rowError.message}` };
  }

  await removeOldObject(supabase, before?.logo_url ?? null, path);

  return { ok: true, message: "Logo updated." };
}

/** Clears the logo entirely, and removes the file behind it. */
export async function clearPartnerLogo(partnerId: string): Promise<LogoResult> {
  const supabase = await createServerClient();

  const { data: before } = await supabase
    .from("partners")
    .select("logo_url")
    .eq("id", partnerId)
    .single();

  const { error } = await supabase.from("partners").update({ logo_url: null }).eq("id", partnerId);
  if (error) return { ok: false, message: `Could not remove the logo: ${error.message}` };

  await removeOldObject(supabase, before?.logo_url ?? null, null);
  return { ok: true, message: "Logo removed. The shop shows its initials again." };
}

/**
 * Delete the file a URL points at, but only if it is one of ours in this
 * bucket. Two of the logos in production were uploaded by hand under a
 * different path shape (`logos/gs.png`), so this parses the URL rather than
 * assuming `<partnerId>/<file>` — and does nothing at all if the URL points
 * somewhere else entirely.
 */
async function removeOldObject(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  previousUrl: string | null,
  keep: string | null
) {
  if (!previousUrl) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = previousUrl.indexOf(marker);
  if (at === -1) return;

  const oldPath = decodeURIComponent(previousUrl.slice(at + marker.length));
  if (!oldPath || oldPath === keep) return;

  // Best effort. A failure here leaves an unreferenced file, which costs a few
  // kilobytes and breaks nothing, so it must never fail the caller's action.
  await supabase.storage.from(BUCKET).remove([oldPath]);
}
