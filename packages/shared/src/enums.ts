export const RECIPIENTS = [
  "mother",
  "father",
  "friend",
  "partner",
  "child",
  "sibling",
  "colleague",
] as const;
export type Recipient = (typeof RECIPIENTS)[number];

export const OCCASION_SLUGS = [
  "birthday",
  "wedding",
  "graduation",
  "anniversary",
  "valentine",
  "newborn",
  "housewarming",
  "eid",
  "mothers-day",
] as const;
export type OccasionSlug = (typeof OCCASION_SLUGS)[number];

export const BUDGET_TIERS = [
  { label: "Under $20", min: 0, max: 20 },
  { label: "$20 - $50", min: 20, max: 50 },
  { label: "$50 - $100", min: 50, max: 100 },
  { label: "$100+", min: 100, max: 100000 },
] as const;

export const CATEGORY_SLUGS = [
  "flowers-gifts",
  "fashion",
  "jewelry-luxury",
  "beauty-perfumes",
  "kids",
  "chocolate-food",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const PROFILE_ROLES = ["customer", "partner", "admin"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const PARTNER_STATUSES = ["pending", "active", "suspended"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const SUB_ORDER_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type SubOrderStatus = (typeof SUB_ORDER_STATUSES)[number];
