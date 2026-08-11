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
  "common.save": "Save",
  "common.saving": "Saving…",
  "common.saved": "Saved.",
  "common.cancel": "Cancel",

  "nav.overview": "Overview",
  "nav.partners": "Partners",
  "nav.settings": "Settings",
  "nav.account": "Account",

  "overview.title": "Overview",
  "overview.thismonth": "This month",
  "overview.orders": "Orders",
  "overview.revenue": "Revenue",
  "overview.commission": "CADO commission",
  "overview.net": "Net to you",
  "overview.bymonth": "Month by month",
  "overview.empty.title": "Nothing to show yet",
  "overview.empty.body": "Once your store gets its first order, your numbers appear here.",

  "feed.title": "Orders",
  "feed.needsaction": "Needs your action",
  "feed.history": "Order history",
  "feed.available": "Available?",
  "feed.yes": "Yes, confirm",
  "feed.no": "Out of stock",
  "feed.confirmed": "Confirmed",
  "feed.rejected": "Marked out of stock",
  "feed.deliverto": "Delivery details",
  "feed.customer": "Customer",

  "prodedit.price": "Price",
  "prodedit.stock": "Stock",
  "prodedit.soldout": "Sold out",
  "prodedit.onsale": "On sale",
  "prodedit.variant.stock": "stock",

  "account.title": "Account",
  "account.password.title": "Change password",
  "account.password.new": "New password",
  "account.password.confirm": "Confirm new password",
  "account.password.submit": "Change password",
  "account.password.done": "Password changed.",

  "admin.overview.title": "Overview",
  "admin.overview.today": "Today",
  "admin.overview.month": "This month",
  "admin.overview.alltime": "All time",
  "admin.overview.orders": "Orders",
  "admin.overview.revenue": "Revenue",
  "admin.overview.commission": "Commission earned",
  "admin.overview.deliveryfees": "Delivery fees",
  "admin.overview.bystatus": "Orders by status",

  "admin.orders.title": "All orders",
  "admin.orders.customer": "Customer",
  "admin.orders.setstatus": "Set status",
  "admin.orders.cancel": "Cancel order",
  "admin.orders.final": "Final",

  "admin.partners.title": "Partners",
  "admin.partners.orders": "Orders",
  "admin.partners.revenue": "Revenue",
  "admin.partners.commission": "CADO earned",
  "admin.partners.payable": "Owed to store",
  "admin.partners.owner": "Owner login",
  "admin.partners.noowner": "No login yet",
  "admin.partners.invite": "Invite a store owner",
  "admin.partners.demo": "DEMO",

  "admin.products.title": "All products",
  "admin.products.store": "Store",

  "admin.settings.title": "Settings",
  "admin.settings.admins": "Admin accounts",
  "admin.settings.commission": "Default commission",
  "admin.settings.commission.note":
    "New stores start at this rate. A store's own rate is set on the Partners page; changing rates only affects future orders — every placed order keeps the rate it was sold under.",
  "admin.settings.delivery": "Delivery fee",
  "admin.settings.delivery.note":
    "Charged per order at checkout. This is set inside the checkout function in the database — changing it is a deliberate code change, not a setting, so the money path can't drift by accident.",
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
