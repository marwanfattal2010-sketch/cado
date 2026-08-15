# Gift Sets — photo sources

Every image in this folder came from **Unsplash or Pexels**, which is Marwan's
standing rule for stock photography (never Pinterest, never Google Images).
Both licences allow commercial use.

These photographs illustrate **placeholder demo stock** invented for two
placeholder stores — *Wrap & Co.* and *The Keepsake Room*. They are NOT the
partner's own photographs. The one real partner in Gift Sets is Surprise Gifts
Shop, whose own photographs live in `scripts/assets/surprise/`.

## Every one of these was opened and looked at, not assumed

Each file below was downloaded and **viewed** before it was attached to
anything, and viewed again from this folder after download. That step is not
optional here: an earlier batch of seed photos was attached on the strength of
filenames alone and it put an empty American football field on "Goalkeeper
Gloves" and a lifestyle sneaker on "Running Trainers".

Twenty-eight candidates were reviewed to get these eight. The listing text for
each product was then written **from its photograph** — it describes what is
actually in the frame, not what the search query was.

| File | Used for | Source |
| --- | --- | --- |
| `hero_gift_boxes.jpg` | Gift Sets hero banner | Pexels https://www.pexels.com/photo/3873488/ |
| `cover_wrap_and_co.jpg` | Wrap & Co. store cover | Pexels https://www.pexels.com/photo/1303080/ |
| `cover_the_keepsake_room.jpg` | The Keepsake Room store cover | Pexels https://www.pexels.com/photo/11770411/ |
| `01_wrapped_box_pair_candle.jpg` | Ribboned Gift Box Set with Candle | Unsplash `https://images.unsplash.com/photo-1784292877311-fd49ac66ddc8` |
| `02_tea_and_candle_box.jpg` | Tea & Candle Evening Box | Pexels https://www.pexels.com/photo/34876378/ |
| `03_candle_and_towel_set.jpg` | Candle & Towel Calm Set | Pexels https://www.pexels.com/photo/7795820/ |
| `04_notebook_candle_basket.jpg` | Notebook & Candle Keepsake Basket | Unsplash `https://images.unsplash.com/photo-1769286145156-70a40fff80ec` |
| `05_new_baby_crate.jpg` | New Baby Keepsake Crate | Unsplash `https://images.unsplash.com/photo-1451443700141-5ddb6d85a8fc` |

Unsplash search pages refuse a server-side `fetch` (401), but
`https://images.unsplash.com/photo-<id>?w=1200&q=80&fm=jpg` downloads fine, so
the CDN URL is the re-downloadable record for those three.

`05_new_baby_crate.jpg` was re-fetched with `&h=850&fit=crop&crop=top` because
the original is a wide frame with the crate in the top half — uncropped, the
product card would have shown mostly bare floorboards.

## Photos deliberately NOT used, and why

The single biggest reason for rejection was **third-party brand logos**, which
0054's rule rules out. Stock photography of "gift hampers" is overwhelmingly
brands photographing their own boxes. Rejected for that reason:

- KitKat / Cadbury / Nestlé / Amul / Hershey's chocolate hampers (several)
- Red Bull and Nutella in a snack basket
- Bang & Olufsen wrapped presents
- "AHLOKI", "ZARI", "VERO empório gourmet", "Bahari", "Big Mood Spa",
  "P.F. Candle Co.", "BATCH" and "Pharma Hemp" own-brand gift boxes
- A "Fashion ®" boxed bathrobe set

Rejected for other reasons:

- A Raksha Bandhan hamper and a Vietnamese Tết basket — real gift sets, but
  tied to a specific festival CADO does not sell into.
- Two CBD gift boxes — attaching a photo is not the way to decide whether the
  storefront sells that.
- Several Christmas-tree scenes — seasonal, and CADO is year-round.
- A German flower-delivery box (`Blumen für dich`) — foreign text on the box,
  and it belongs in Flowers, not Gift Sets.
- A single wrapped box, a lone candle, a mug in a box: correct and pretty, but
  a Gift Set has to be several things together. 0054's own note.

## Two things worth Marwan's eye

- `04_notebook_candle_basket.jpg` has small invented lettering in the frame —
  a notebook reading "LINEN LOGIC" and a candle label reading "RITUAL". Neither
  is a real brand, but the words are legible. If he would rather no lettering
  at all appeared, that is the one to pull.
- `05_new_baby_crate.jpg` shows a mitten pack printed "2 PAIRS · SCRATCH FREE
  MITTENS · 0-3" with a small paw mark. It is a product descriptor rather than
  a brand wordmark, which is why it was kept.
