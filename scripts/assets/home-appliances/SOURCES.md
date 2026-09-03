# Home & Appliances — image sources

Every image used by `scripts/seed-home-appliances.mjs` is from **Unsplash**,
one of the two sources Marwan allows (Unsplash or Pexels — never Pinterest,
never Google Images).

There are **no image files in this directory**. The script fetches each photo
from `images.unsplash.com` by id at run time and uploads it straight to
Supabase Storage, the same way `seed-sport-category.mjs` works — so the id
below *is* the file, and re-running the script reproduces the same upload.

Unsplash's search pages 401 a plain `fetch` from Node (bot protection), but
`https://images.unsplash.com/photo-<id>` serves fine server-side. That is why
ids are recorded rather than page links.

**Every photo below was rendered on screen and looked at before it was used.**
An alt tag and a search query are not evidence of what is in a file — that is
exactly how ten wrong photos ended up on Sport (see that script's header).

---

## Used

| Product | Unsplash id | What is actually in the frame |
|---|---|---|
| Pour-Over Coffee Set | `1610874150308-a1e6f8c905d9` | White ceramic pour-over cone on a glass carafe, tiled wall behind |
| Cast Iron Teapot | `1578920181445-0a0b285b9757` | Dark hobnail cast-iron teapot, green background |
| Stovetop Espresso Maker | `1638129284529-bed6d6f588e7` | Silver moka pot on a flat yellow background, no visible maker's mark |
| Gooseneck Electric Kettle | `1571552879083-e93b6ea70d1d` | White gooseneck kettle on white, clean studio shot |
| Stoneware Serving Bowl Set | `1764521727337-fe33394efc4f` | Hand holding a stack of glazed stoneware bowls |
| Olive Wood Board & Knife Set | `1690983322029-eee73c0afa14` | Wooden cutting board with two knives, dark surface |
| Striped Ceramic Storage Jars | `1561696434-f5c2f1176cb7` | Two lidded ceramic canisters in coloured stripes |
| Glazed Ceramic Serving Bowl | `1603697227834-14e3694abc7b` | Single blue-green glazed bowl, white background |
| Turkish Cotton Towel Set | `1760722974657-f64bce2f9cc5` | Stack of folded cream towels |
| Linen Bedding Set | `1617325247661-675ab4b64ae2` | Made bed, white pillows and linen, bright room |
| Washed Linen Throw | `1518019671582-55004f1bc9ab` | Close-up of grey washed linen, folds and texture |

`Adjustable Desk Lamp` keeps the photo it already had; it was moved into this
category from Electronics rather than created here.

---

## Rejected on sight

These came back in the same searches and were **not** used. Recorded so nobody
reaches for them later thinking they were simply missed.

| Unsplash id | Why not |
|---|---|
| `1639298109207-5a9ccc254481` | Hot-pink and turquoise towels. Fights the cream and persimmon palette on every screen it would appear on. |
| `1759847365004-8c17665602a6` | Sold as "ceramic bowls on a shelf"; the frame is too dark to make out what the objects are. |
| `1603387008808-d96b9631ed73` | Moka pot with the maker's name legible across the body. Migration 0054 bans brand names in titles, and a readable third-party mark on a listing from a shop that does not carry that brand is the same problem with a picture attached. |
| `1587132117816-061b35073a4e` | A round tree-slice serving board — decorative, and not what "Olive Wood Board & Knife Set" promises. |
