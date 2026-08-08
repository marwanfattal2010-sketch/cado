export function DeliveryReturns() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="font-display text-2xl font-semibold">Delivery &amp; Returns</h1>
      <div className="mt-6 flex flex-col gap-3">
        <div className="rounded-card bg-white p-4 ring-1 ring-ink/5">
          <p className="text-sm font-medium">Same-day delivery</p>
          <p className="mt-1 text-sm text-ink/60">Order before 4PM and it arrives the same day, across Lebanon.</p>
        </div>
        <div className="rounded-card bg-white p-4 ring-1 ring-ink/5">
          <p className="text-sm font-medium">Multiple stores</p>
          <p className="mt-1 text-sm text-ink/60">
            If your order includes items from more than one store, they may arrive as separate deliveries.
          </p>
        </div>
        <div className="rounded-card bg-white p-4 ring-1 ring-ink/5">
          <p className="text-sm font-medium">Returns &amp; exchanges</p>
          <p className="mt-1 text-sm text-ink/60">
            Reach out with your order number and we'll coordinate with the store on your behalf.
          </p>
        </div>
      </div>
    </div>
  );
}
