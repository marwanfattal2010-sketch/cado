# CADO dashboard — demo logins

Log in at the dashboard's `/login` page. These are **demo accounts** on the
live database — the five stores are real seed stores from the storefront, and
anything you do as them (confirming orders, changing prices) is real and
visible to shoppers. They carry a **DEMO** badge on the admin Partners page,
keyed to the `@cado-demo.local` email domain: invite a real owner for a store
and the badge disappears by itself.

When a real store signs up, replace its demo login via
**Partners → Invite a store owner** in the admin panel.

## Admin

| Role | Email | Password |
| --- | --- | --- |
| CADO admin (demo) | `demo-admin@cado-demo.local` | `B5aK-pYXS-yubh-9uKZ` |

Marwan's own account (`fattalmarwan33@gmail.com`, storefront password) is also
an admin. The demo admin exists so testing never needs your personal login —
remove it from **Settings → Admin accounts** whenever you want.

## Store owners

| Store | Email | Password |
| --- | --- | --- |
| Cedar Street Fashion | `demo-cedar-street-fashion@cado-demo.local` | `QnBA-2dEx-nwJK-Ab7E` |
| Beirut Blooms | `demo-beirut-blooms@cado-demo.local` | `tcCC-JtKr-7eBG-m3QJ` |
| Maison Zahra Jewellers | `demo-maison-zahra-jewellers@cado-demo.local` | `cMT8-3znU-Zz3B-wrh5` |
| Little Explorers Toys | `demo-little-explorers-toys@cado-demo.local` | `qZP5-yg76-aux8-EqFN` |
| Cocoa & Co. | `demo-cocoa-and-co@cado-demo.local` | `pVBp-pUGH-czus-VvNH` |

## Isolation-test accounts (not for demos)

`test-owner-a/b/c/d@cadotest.local` and `test-customer@cadotest.local` belong
to the automated cross-store isolation test (`pnpm --filter @cado/dashboard
test:isolation`) and its seeded `[TEST]` stores. Leave them alone; tear down
with `pnpm --filter @cado/dashboard seed:teardown`.
