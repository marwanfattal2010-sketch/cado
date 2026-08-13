/**
 * One place that decides what a store's URL looks like.
 *
 * Slugs are the address — /store/gs reads better than a uuid and is what
 * anyone would paste into a message. Every partner row has one and they are
 * unique, but the fallback to `id` is not dead code: several queries in the
 * app select a partner without its slug, and a link that silently renders
 * `/store/undefined` is worse than an ugly one.
 */
export function storePath(store: { slug?: string | null; id?: string | null } | null | undefined) {
  if (!store) return "/browse";
  return `/store/${store.slug ?? store.id}`;
}
