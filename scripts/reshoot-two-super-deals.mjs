/**
 * Re-photographs two of the six products in the Fashion "Super deals" band.
 *
 * WHY ONLY TWO
 *
 * Six products carry a real discount and surface in that band. Three of them
 * already have clean e-commerce shots (Bugatti Men Scarf, Geox Men Belt,
 * Tailored Blazer) and are not touched. Three did not:
 *
 *   Silk Wrap Dress    — a model against a black moody backdrop
 *   Merino Crewneck    — a STACK of assorted knitwear, so you could not tell
 *                        which item was for sale
 *   Leather Weekend Bag — a duffel lying on a road at sunset, a lifestyle
 *                        scene rather than a product shot
 *
 * The first two are replaced here. THE BAG IS DELIBERATELY LEFT ALONE. Four
 * rounds of searching produced no clean leather weekender on a plain ground:
 * the candidates were a Patagonia duffel with the logo showing, a bag with an
 * "AILILE" wordmark, another with a large monogram, three ceramic vases the
 * alt text described as bags, a burlap drawstring pouch and a foil packet.
 * Its current photograph is at least a real leather duffel, so the item is
 * right and only the styling is wrong — and a photograph on a listing is a
 * claim about what someone is buying. A prettier photo of the wrong object is
 * a worse outcome than a badly styled photo of the right one. This is the
 * mistake that once put a satin dress on the Merino Crewneck.
 *
 * WHAT THIS IS ALLOWED TO TOUCH
 *
 * `product_images` rows, and nothing else. No title, price, description,
 * category, stock or active flag is written by this file.
 */

import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync("apps/dashboard/.env.local", "utf8");
const URL_BASE = /SUPABASE_URL=(.*)/.exec(env)[1].trim();
const KEY = /SERVICE_ROLE_KEY=(.*)/.exec(env)[1].trim();
const BUCKET = "product-images";

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

/**
 * Every candidate below was opened and looked at at full size before being
 * chosen — never picked from alt text, which on this project has described
 * ceramic vases as handbags and a pile of woven table mats as stacked caps.
 */
const SHOTS = [
  {
    title: "Silk Wrap Dress",
    // Brown satin wrap dress, cream draped backdrop, whole garment in frame.
    // Plain and light, which is what the black studio shot it replaces was not.
    unsplashId: "1704775985599-3518cbc459bf",
    photographer: "GLOBALDSIO IT SOLUTION",
    file: "wrap-plain.jpg",
  },
  {
    title: "Merino Crewneck",
    // ONE cream ribbed knit sweater against a plain light ground, no visible
    // label. The shot it replaces was a stack of several different jumpers.
    unsplashId: "1574201635302-388dd92a4c3f",
    photographer: "Valna Studio",
    file: "crewneck-plain.jpg",
  },
  {
    title: "Leather Weekend Bag",
    /*
     * Found on a later pass, after four rounds had turned up nothing usable.
     * Cognac leather, twin rolled handles, two buckled straps and a detachable
     * shoulder strap, lit on pure white with a soft reflection — the register a
     * bag seller actually shoots in, which is what was asked for. Checked at
     * full size for a maker's mark: there is none.
     *
     * Honest note on the item: it is a structured barrel bag rather than a
     * large soft holdall. It is a leather travel bag with a shoulder strap, so
     * the listing is not misdescribed, but it reads smaller than "weekend"
     * might suggest. That is a far smaller gap than the photograph it replaces,
     * which was a duffel lying on a road at sunset.
     */
    unsplashId: "1691480150204-66dd1eb77391",
    photographer: "Unsplash",
    file: "weekender-white.jpg",
  },
];

/** Square, generous, and cropped in the file rather than left to object-fit. */
const PARAMS = "?w=1200&h=1200&fit=crop&q=80&fm=jpg";

const rest = async (p, init = {}) =>
  fetch(`${URL_BASE}/rest/v1/${p}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });

async function main() {
  for (const shot of SHOTS) {
    const found = await (
      await rest(`products?select=id,title,partner_id&title=eq.${encodeURIComponent(shot.title)}&is_active=eq.true`)
    ).json();

    if (!Array.isArray(found) || found.length !== 1) {
      console.log(`SKIP  ${shot.title} — expected one product, got ${found?.length ?? "an error"}`);
      continue;
    }
    const product = found[0];

    const res = await fetch(`https://images.unsplash.com/photo-${shot.unsplashId}${PARAMS}`);
    if (!res.ok) {
      console.log(`SKIP  ${shot.title} — download returned ${res.status}`);
      continue;
    }
    const bytes = Buffer.from(await res.arrayBuffer());

    const storagePath = `${product.partner_id}/${product.id}/${shot.file}`;
    const up = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${storagePath}`, {
      method: "POST",
      headers: { ...H, "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: bytes,
    });
    if (!up.ok) {
      console.log(`SKIP  ${shot.title} — upload failed ${up.status} ${await up.text()}`);
      continue;
    }

    // Demote whatever was primary, then make THIS path primary. The old rows
    // are kept: a product is allowed more than one photograph, and deleting
    // history is not this script's job.
    await rest(`product_images?product_id=eq.${product.id}&is_primary=eq.true`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ is_primary: false }),
    });

    /*
     * RE-RUNNABLE. The first version of this always INSERTED, so running it
     * twice left two rows pointing at the same file and a dedupe afterwards
     * deleted the wrong one — the crewneck briefly ended up with no primary
     * image at all. Now an existing row for this exact path is promoted, and
     * a row is only created when there isn't one.
     */
    const existing = await (
      await rest(
        `product_images?select=id&product_id=eq.${product.id}&storage_path=eq.${encodeURIComponent(storagePath)}`
      )
    ).json();

    const write = existing.length
      ? await rest(`product_images?id=eq.${existing[0].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ is_primary: true }),
        })
      : await rest("product_images", {
          method: "POST",
          headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({
            product_id: product.id,
            partner_id: product.partner_id,
            storage_path: storagePath,
            is_primary: true,
          }),
        });

    console.log(
      write.ok
        ? `OK    ${shot.title} -> ${storagePath}  (${(bytes.length / 1024) | 0}KB, ${shot.photographer}, Unsplash)`
        : `FAIL  ${shot.title} — ${write.status} ${await write.text()}`
    );
  }
}

main();
