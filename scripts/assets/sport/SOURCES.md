# Sport — image sources

Every image used by `scripts/seed-sport-category.mjs` is from **Unsplash**,
which is one of the two sources Marwan allows (Unsplash or Pexels — never
Pinterest, never Google Images).

Unlike the Surprise Gifts Shop folder next door, there are **no image files in
this directory**. The script fetches each photo from `images.unsplash.com` at
run time by id and uploads it straight to Supabase Storage, the same way
`seed-product-photos.mjs` works — so the source URL below *is* the file, and
re-running the script reproduces the exact same upload.

Unsplash's search pages return 401 to a plain `fetch` from Node (bot
protection), but `https://images.unsplash.com/photo-<id>` serves fine
server-side. That is why the ids are recorded rather than page links.

---

## Used

The **page** link is the one to open to see the photo and its photographer.
The **file** link is the exact URL the script downloads.

### Sport tab hero

- Page: https://unsplash.com/photos/aerial-view-of-football-field-deGn9vSwXIM
- File: https://images.unsplash.com/photo-1556056504-5c7696c4c28d

### Shop covers

| Shop | Page | File |
| --- | --- | --- |
| Baseline Sports | https://unsplash.com/photos/empty-football-field-in-aerial-photgraphy-raesgfwU7iM | `photo-1546717003-caee5f93a9db` |
| Pace Athletics | https://unsplash.com/photos/a-red-running-track-with-white-lines-on-it-axCCLfPJGz4 | `photo-1601121853354-e6e866bd2bac` |
| Courtside Sports | https://unsplash.com/photos/an-overhead-view-of-a-red-tennis-court-dtpCEfKT1H4 | `photo-1697746900540-ad490645f667` |

### Product photos

| Product | Page | File |
| --- | --- | --- |
| Match Football | https://unsplash.com/photos/a-football-ball-on-the-grass-XnNkkw9H9Jc | `photo-1660926655800-3d11219f390d` |
| Goalkeeper Gloves | https://unsplash.com/photos/a-soccer-goalies-glove-laying-on-a-soccer-field-AYlc19ADodk | `photo-1632072820781-79f3a064f640` |
| Outdoor Basketball | https://unsplash.com/photos/brown-basketball-on-gray-concrete-floor-AhAMJgq5QPM | `photo-1595795279832-13f0df36fbb9` |
| Tennis Racket & Balls | https://unsplash.com/photos/a-tennis-racket-and-three-tennis-balls-on-a-court-nYmHWEIh0BM | `photo-1684443726782-1d5bb1aecbd5` |
| Badminton Set | https://unsplash.com/photos/pair-of-red-badminton-rackets-U5epRU6sY_A | `photo-1559309106-ed14040fd35d` |
| Insulated Sports Water Bottle | https://unsplash.com/photos/green-bottle-on-white-table-reEySFadyJQ | `photo-1602143407151-7111542de6e8` |
| Yoga Mat & Cork Blocks Set | https://unsplash.com/photos/a-yoga-mat-with-two-blocks-on-top-of-it-b8Q5fHBsyik | `photo-1646239646963-b0b9be56d6b5` |

A `File` id above becomes a working URL as
`https://images.unsplash.com/<id>` — that is the id hard-coded in
`scripts/seed-sport-category.mjs`.

## Every one of these was looked at, not assumed

Each file was downloaded and opened before it was listed here. That step is
not optional, and this folder exists partly as evidence of it: the previous
batch of Sport photos was attached from a hard-coded list of ids on the
strength of the search query alone, and **all ten were wrong**. They were
deleted by this script. What they actually showed:

| Product | What the photo actually was |
| --- | --- |
| Goalkeeper Gloves | an empty American football field — no gloves in the frame |
| Shin Pads | a children's football training session, faces visible |
| Training Tracksuit | a pair of sneakers dangling off a ledge |
| Sports Holdall | a black laptop backpack |
| Training Tee & Shorts Set | a woman doing sit-ups in leggings — no shorts |
| Indoor Football Trainers | a branded running shoe |
| Running Trainers | a pastel lifestyle sneaker |
| Firm Ground Football Boots | correct item, large brand wordmark across the ball |
| Match Football | correct item, large brand wordmark across the ball |
| Football Kit | an action shot of an identifiable player, two brand logos |

## Rejected, and why — so the same ones are not tried again

Searching sportswear on Unsplash is mostly a search for other people's brands.
These were all downloaded, opened, and thrown out:

- **Football boots**, several — every studio shot found carries three stripes
  or a swoosh, and two had the model name embossed on the upper.
- **Running shoes**, six candidates — all clean white-background shots, all
  named brands (one still had the wordmark on the tongue).
- **Gym / duffel bags** — one turned out to be a Getty Images promotional bag
  with "GETY LISTED NYSE" printed across it; another had a branded boxing
  glove sitting in the opening; the rest were leather weekend bags, which is
  not a match bag with a boot compartment.
- **Tracksuits** — one had a maker's wordmark down the leg; another, filed
  under "tracksuit", was a **motorcycle racer in leathers at sunset**.
- **Skipping rope**, top result for the search — a novelty image where the
  handles are **two sausages**. Nothing about the filename says so.
- **Tennis rackets**, two — both with the maker's name printed across the
  frame in large type.
- **Dumbbells** — brand names embossed on the end caps and on the plyo box.
- **Shin pads** — there is no product shot on Unsplash. The results are
  kickboxing sessions and a cricket leg pad.

Eight of the ten original Sport products therefore have **no photo**, on
purpose. A missing photo reads as "not shot yet", which is true. A
near-enough photo is a promise about what arrives in the box.

## One thing worth Marwan's eye

The goalkeeper glove photo shows the gloves lying on a corner flag line rather
than shot against a backdrop, so they sit small in the frame. There is a faint
maker's marking on the glove itself, illegible at any size the app displays.
If he wants tighter product-style shots across Sport, that is a photography
job for the real shop, not something stock can solve.

## 2026-08-15 — Sport became an equipment shop, not a clothing rail

Marwan: "I don't mean sports clothes, I mean balls, water bottles, dumbbells."

That call fixed a problem that had resisted three attempts. Ten Sport products
had no photograph and every one of them was apparel. Seventeen sportswear
candidates were downloaded and OPENED on this date and all seventeen were
rejected for visible branding:

  Nike x2 (a Free running shoe sold as an indoor trainer, and boots)
  Sergio Tacchini x2, Champion, Puma, Asics
  Barker and Redtape (both legible on the insole)
  a duffel bag covered in Getty / iStock / Unsplash's own logos
  a skipping rope whose handles are sausages — a conceptual art piece, and
    the alt text said only "orange skipping rope"

Free sportswear photography is almost entirely of branded gear. Equipment is
not: a dumbbell is a lump of iron and a bottle is a bottle.

Seven apparel products were DEACTIVATED, not deleted — reversible in one
update if real photography ever arrives — and equipment added in their place:

dumbbell-pair.jpg     https://unsplash.com/photos/1685633224688-6a77675eb119
insulated-bottle.jpg  https://unsplash.com/photos/1602143407151-7111542de6e8

Both were opened and checked for logos before being attached.

STILL WITHOUT A PHOTO: Shin Pads, Skipping Rope, Tube of Tennis Balls. All
three are equipment and should be findable; they simply were not found yet.
A missing photo reads as "not shot yet", which is true.
