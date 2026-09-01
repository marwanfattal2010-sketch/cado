import { redirect } from "next/navigation";

/**
 * Products no longer has a page of its own (V4 §5). A product belongs to a
 * shop, and every real reason to open this page — check a catalogue, fix a
 * price, hide something out of stock — starts by knowing WHICH shop. The
 * catalogue now lives on the store page's Products tab.
 *
 * This route stays as a redirect rather than a 404 because bookmarks, the old
 * nav and links in earlier pages still point at it.
 */
export default function AdminProductsRedirect() {
  redirect("/admin/stores");
}
