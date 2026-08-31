/**
 * UI strings for the delivery dispatch section (§4.8).
 *
 * Deliberately a LOCAL dictionary rather than new keys in src/lib/dictionary.ts:
 * that file is being appended to by another worker on this branch at the same
 * time, and two append-only edits to one file is a guaranteed merge conflict.
 * The shape matches lib/dictionary.ts exactly (a const object plus a typed
 * accessor with a dev-time warning), so folding these keys into the global
 * dictionary later is a copy-paste and a rename of the accessor — no component
 * changes, and Arabic can be added here the same way it would be added there.
 */
export const en = {
  "delivery.title": "Delivery dispatch",

  "delivery.kpi.awaiting": "Awaiting pickup",
  "delivery.kpi.out": "Out for delivery",
  "delivery.kpi.delivered": "Delivered today",
  "delivery.kpi.unit": "orders",

  "delivery.lane.awaiting": "Awaiting pickup",
  "delivery.lane.out": "Out for delivery",
  "delivery.lane.delivered": "Delivered today",

  "delivery.empty.awaiting": "Nothing waiting for pickup",
  "delivery.empty.out": "Nothing on the road right now",
  "delivery.empty.delivered": "Nothing delivered today yet",

  "delivery.card.pickup": "Pick up from",
  "delivery.card.dropoff": "Drop off at",
  "delivery.card.recipient": "Recipient",
  "delivery.card.nopickup": "No pickup address on file",
  "delivery.card.noaddress": "No delivery address on file",
  "delivery.card.nophone": "No phone on file",
  "delivery.card.storephone": "Store contact",
  "delivery.card.deliveredat": "Delivered",
  "delivery.card.cost": "Recorded cost",
  "delivery.card.nocost": "No cost recorded",

  "delivery.driver.assigned": "Driver",
  "delivery.driver.none": "No driver assigned",
  "delivery.driver.assign": "Assign driver",
  "delivery.driver.change": "Change",
  "delivery.driver.choose": "Choose a driver…",
  "delivery.driver.save": "Save",
  "delivery.driver.saving": "Saving…",
  "delivery.driver.cancel": "Cancel",
  "delivery.driver.costlabel": "Delivery cost (USD)",
  "delivery.driver.costhint": "Standard fee",
  "delivery.driver.costblank": "Leave blank until you know the real cost.",
  "delivery.driver.noactive": "No active drivers yet — add one below.",

  "delivery.advance.out": "Mark out for delivery",
  "delivery.advance.delivered": "Mark delivered",
  "delivery.advance.working": "Working…",
  "delivery.advance.confirmdelivered": "Mark this order delivered? Delivered is final.",

  "delivery.drivers.title": "Drivers",
  "delivery.drivers.name": "Name",
  "delivery.drivers.phone": "Phone",
  "delivery.drivers.today": "Assigned today",
  "delivery.drivers.status": "Status",
  "delivery.drivers.active": "Active",
  "delivery.drivers.inactive": "Inactive",
  "delivery.drivers.deactivate": "Deactivate",
  "delivery.drivers.activate": "Activate",
  "delivery.drivers.empty": "No drivers yet",
  "delivery.drivers.add": "Add driver",
  "delivery.drivers.adding": "Adding…",
  "delivery.drivers.addname": "Driver name",
  "delivery.drivers.addphone": "Phone number",
  "delivery.drivers.note":
    "Drivers are deactivated, never deleted — a deleted driver would orphan the deliveries they already made.",

  "delivery.error.generic": "That didn't save. Try again.",
  "delivery.error.needdriver": "Pick a driver first.",
  "delivery.error.needname": "A name and a phone number are both required.",
  "delivery.error.badcost": "Enter a cost like 5 or 5.50, or leave it blank.",

  "delivery.note.window":
    "The board reads the 200 most recent orders. Today is Asia/Beirut.",
} as const;

export type DeliveryKey = keyof typeof en;

const dictionaries: Record<string, Partial<Record<DeliveryKey, string>>> = { en };

export function s(key: DeliveryKey, locale = "en"): string {
  const value = dictionaries[locale]?.[key] ?? en[key];
  if (value === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[delivery strings] missing key: ${key}`);
    }
    return key;
  }
  return value;
}
