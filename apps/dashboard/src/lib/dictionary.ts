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

  /* ---- store profile (§5.5) ---- */
  "profile.title": "Store profile",
  "profile.subtitle": "This is what customers see on your CADO store page.",
  "profile.viewstore": "View my store on CADO →",
  "profile.section.identity": "Name and story",
  "profile.section.images": "Logo and cover",
  "profile.section.fulfilment": "Pickup and gift wrapping",
  "profile.name": "Store name",
  "profile.tagline": "Tagline",
  "profile.tagline.hint": "One short line under your name.",
  "profile.description": "About your store",
  "profile.city": "City / area",
  "profile.logo": "Logo image URL",
  "profile.cover": "Cover image URL",
  "profile.image.hint": "Paste a link to an image. Uploading from your phone isn't available yet — send photos to CADO and we'll host them for you.",
  "profile.giftwrap": "I offer gift wrapping",
  "profile.giftwrap.hint": "Shown on your store page and at checkout.",
  "profile.pickup": "Pickup address for drivers",
  "profile.pickup.hint": "Where a CADO driver collects orders. Customers never see this.",
  "profile.driver": "Contact number for drivers",
  "profile.slug.locked": "Your store's web address is set by CADO and can't be changed here.",
  "profile.saved": "Store profile saved.",

  /* ---- reviews (§5.6) ---- */
  "reviews.title": "Reviews",
  "reviews.subtitle": "What customers said about your products.",
  "reviews.empty.title": "No reviews yet",
  "reviews.empty.body": "A customer can leave a review once their order has been delivered. Theirs will show up here.",
  "reviews.average": "Average rating",
  "reviews.count": "Reviews",
  "reviews.reply": "Reply publicly",
  "reviews.reply.placeholder": "Thanks for shopping with us…",
  "reviews.reply.yours": "Your public reply",
  "reviews.reply.hint": "Your reply is shown to everyone under this review.",
  "reviews.reply.edit": "Edit reply",
  "reviews.reply.save": "Post reply",
  "reviews.reply.saved": "Reply posted.",
  "reviews.hidden": "Hidden by CADO",
  "reviews.hidden.hint": "This review isn't shown on the storefront. Only CADO can hide or restore a review.",

  /* ---- payout details (§5.7) ---- */
  "payout.title": "How CADO pays you",
  "payout.subtitle": "Where your money goes when a payout is released.",
  "payout.method": "Payment method",
  "payout.method.cash": "Cash",
  "payout.method.whish": "Whish",
  "payout.method.bank": "Bank transfer",
  "payout.holder": "Account holder name",
  "payout.number": "Account number",
  "payout.cash.hint": "For cash, account details are optional — leave them blank if you collect in person.",
  "payout.save": "Save payout details",
  "payout.saved": "Payout details saved.",
  "payout.lastupdated": "Last updated",
  "payout.by.you": "by you",
  "payout.by.other": "by another account at your store",
  "payout.never": "Not set up yet. CADO can't pay you until this is filled in.",
  "payout.staffonly.title": "Only the store owner can change payout details",
  "payout.staffonly.body": "You're signed in as staff. Ask your store owner to set this up.",

  /* ---- pause my store ---- */
  "storepause.title": "Temporarily pause my store",
  "storepause.body": "Pausing hides your products from the CADO storefront. Nothing is deleted — your orders, products and payouts all stay exactly as they are, and resuming puts everything back.",
  "storepause.pause": "Pause my store",
  "storepause.resume": "Resume my store",
  "storepause.paused.title": "Your store is paused",
  "storepause.paused.body": "Customers can't see or order your products right now.",
  "storepause.unavailable":
    "Pausing isn't switched on for your account yet. Ask CADO to pause your store for you.",

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

  "admin.support.title": "Support & reviews",
  "admin.support.tab.tickets": "Support tickets",
  "admin.support.tab.reviews": "Reviews",
  "admin.support.filter.open": "Open",
  "admin.support.filter.replied": "Replied",
  "admin.support.filter.closed": "Closed",
  "admin.support.filter.all": "All",
  "admin.support.working": "Working…",
  "admin.support.close": "Close ticket",
  "admin.support.reopen": "Reopen ticket",
  "admin.support.vieworder": "View order",
  "admin.support.noreplies": "No replies yet.",
  "admin.support.thread": "Replies",
  "admin.support.you": "CADO support",
  "admin.support.reply.label": "Reply to this ticket",
  "admin.support.reply.placeholder": "Write a reply to the customer…",
  "admin.support.reply.send": "Send reply",
  "admin.support.reply.sending": "Sending…",
  /* Honest about delivery. Nothing here emails or WhatsApps anyone yet, and
     the storefront does not render a support thread either — so the reply is
     stored and readable, not delivered. Never soften this into "sent". */
  "admin.support.delivery.title": "Replies are stored, not sent",
  "admin.support.delivery.body":
    "Sending saves the reply on the ticket and marks it replied. The customer's own account can read it, but the storefront does not show a support thread yet, and no email or WhatsApp message goes out. Follow up by phone if it's urgent.",
  "admin.support.tickets.empty.title": "No support tickets",
  "admin.support.tickets.empty.body":
    "Nothing in the storefront opens a ticket yet. Once customers can raise an issue from an order, each one lands here with their message, the order it's about, and a box to reply.",
  "admin.support.reviews.empty.title": "No reviews yet",
  "admin.support.reviews.empty.body":
    "A review can only be written by the customer who bought that exact item, after it's delivered. When the first one arrives you'll be able to read it here and hide it if it breaks the rules.",
  "admin.support.reviews.filtered.title": "No reviews match these filters",
  "admin.support.reviews.filtered.body": "Clear the filters to see every review.",
  "admin.support.reviews.count": "Reviews shown",
  "admin.support.reviews.avg": "Average rating",
  "admin.support.reviews.hidden": "Hidden",
  "admin.support.reviews.rating.all": "Any rating",
  "admin.support.review.hide": "Hide review",
  "admin.support.review.show": "Show review",
  "admin.support.review.storereply": "Store replied",

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
