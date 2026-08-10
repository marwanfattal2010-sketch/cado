/**
 * Every user-facing string lives here from day one so an Arabic dictionary can
 * be dropped in later without touching components. Keys are grouped by area.
 * Access with t("group.key"); missing keys fall back to the key itself and
 * warn in dev.
 */
export const en = {
  "app.name": "CADO Partners",
  "app.tagline": "Your store, your orders, your payouts.",

  "nav.orders": "Orders",
  "nav.products": "Products",
  "nav.payouts": "Payouts",
  "nav.stores": "Stores",
  "nav.invites": "Invitations",
  "nav.signout": "Sign out",

  "login.title": "Sign in",
  "login.subtitle": "Store owners and CADO staff.",
  "login.email": "Email",
  "login.password": "Password",
  "login.submit": "Sign in",
  "login.working": "Signing in…",
  "login.error.generic": "That email and password didn't match. Try again.",
  "login.error.norole": "This account has no dashboard access yet. Contact CADO.",

  "setpw.title": "Set your password",
  "setpw.subtitle": "Choose a password to finish setting up your store account.",
  "setpw.password": "New password",
  "setpw.confirm": "Confirm password",
  "setpw.submit": "Save and continue",
  "setpw.working": "Saving…",
  "setpw.mismatch": "The two passwords don't match.",
  "setpw.tooshort": "Use at least 10 characters.",
  "setpw.invalidlink": "This link has expired or was already used. Ask CADO for a new invitation.",

  "orders.title": "Orders",
  "orders.empty.title": "No orders yet",
  "orders.empty.body": "When a customer buys from your store, their order lands here.",
  "orders.item.awaiting": "Awaiting your confirmation",
  "orders.confirm": "Confirm",
  "orders.reject": "Can't fulfil",

  "products.title": "Products",
  "products.empty.title": "No products yet",
  "products.empty.body": "Products you list on CADO appear here.",
  "products.active": "Active",
  "products.hidden": "Hidden",
  "products.stock": "in stock",

  "payouts.title": "Payouts",
  "payouts.empty.title": "Nothing owed yet",
  "payouts.empty.body": "Once your first orders are delivered, what CADO owes you shows up here.",
  "payouts.pending": "Pending",
  "payouts.paid": "Paid",
  "payouts.net": "Net to you",
  "payouts.gross": "Gross",
  "payouts.commission": "CADO commission",

  "admin.stores.title": "Stores",
  "admin.stores.commission": "Commission",
  "admin.stores.status": "Status",
  "admin.invites.title": "Invite a store owner",
  "admin.invites.email": "Owner's email",
  "admin.invites.store": "Store",
  "admin.invites.submit": "Send invitation",
  "admin.invites.working": "Sending…",
  "admin.invites.sent": "Invitation sent. They'll get an email to set their password.",
  "admin.invites.list": "Invitations",

  "status.pending": "Awaiting action",
  "status.accepted": "Confirmed",
  "status.preparing": "Preparing",
  "status.ready": "Ready",
  "status.out_for_delivery": "Out for delivery",
  "status.delivered": "Delivered",
  "status.cancelled": "Cancelled",

  "common.loading": "Loading…",
  "common.retry": "Try again",
  "common.error": "Something went wrong.",
} as const;

export type DictKey = keyof typeof en;

const dictionaries: Record<string, Partial<Record<DictKey, string>>> = { en };

export function t(key: DictKey, locale = "en"): string {
  const value = dictionaries[locale]?.[key] ?? en[key];
  if (value === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[dictionary] missing key: ${key}`);
    }
    return key;
  }
  return value;
}
