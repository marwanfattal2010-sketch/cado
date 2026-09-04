# Store logos

Drop the real logo file for a shop in **this folder**, named after the shop's
slug, and it appears in the store circles with no code change at all. The tab
picks files up with `import.meta.glob`, so adding one is a file copy, not an
edit — but Vite reads the folder at dev-server start, so **restart the dev
server** after adding a file.

## Rules

- **PNG only.** `.jpg`, `.svg` and `.webp` are ignored by the glob.
- **Transparent background**, or white. The circle is white and the logo is
  centred inside 18% padding, so a logo on its own coloured tile will show that
  tile as a square inside a white disc.
- **Square-ish artwork, 512×512 or larger.** The 18% padding is what makes a
  wide wordmark and a round monogram read at the same optical size, so do not
  pre-pad the file yourself.
- **Never a storefront photo.** These are logos. A photo of a shop front is
  what the circles used to show and it is exactly what this replaces.

## Expected filenames

The eight that sit in the visible 4x2 row, in row order:

| File | Store |
| --- | --- |
| `gs.png` | GS |
| `zahar.png` | Zahar |
| `adidas.png` | Adidas |
| `nike.png` | Nike |
| `pull-and-bear.png` | Pull & Bear |
| `bershka.png` | Bershka |
| `mango.png` | Mango |
| `lc-waikiki.png` | LC Waikiki |

The three that appear under "See all" but not in the row:

| File | Store |
| --- | --- |
| `anchor-and-oak.png` | Anchor & Oak |
| `cedar-street-fashion.png` | Cedar Street Fashion |
| `solstice-studio.png` | Solstice Studio |

## What happens while a file is missing

The circle renders **cream with the shop's name in text**, near-black and
centred. That is a deliberate, finished-looking fallback, not a broken image —
so the row is safe to ship half-filled, and each logo improves it the day it
lands. No brand mark is ever drawn, generated or downloaded by the app.
