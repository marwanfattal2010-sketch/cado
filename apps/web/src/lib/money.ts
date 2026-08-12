/**
 * One place that decides how money looks on the storefront.
 *
 * Prices are numeric(10,2) in Postgres and place_order() charges the exact
 * cents, so every amount we print has to agree with what we take to the cent.
 * Rounding a $56.63 total to "$57" on the checkout screen tells the customer to
 * send the wrong Whish transfer, and that transfer never reconciles.
 *
 * Cents are shown only when there are cents, so a whole-dollar catalogue still
 * reads "$49" rather than "$49.00".
 */

const WHOLE = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const CENTS = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "$0";
  // Round to cents before asking "is this whole?" — 14.5 * 3 is
  // 43.499999999999996 in floating point, and without this it would print
  // "$43.50" but only by accident, while 3 * 0.1 would fail the whole test and
  // print "$0.30" instead of "$0.3".
  const cents = Math.round(n * 100) / 100;
  return `$${Number.isInteger(cents) ? WHOLE.format(cents) : CENTS.format(cents)}`;
}
