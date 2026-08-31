import { BrandLogo } from "@/components/BrandLogo";
import { ApplyForm } from "./ApplyForm";

export const dynamic = "force-dynamic";

/**
 * The public application page (§2.3). Anyone can apply; only an admin can
 * turn an application into a live store. The categories offered are the nine
 * real ones — an applicant picking a shelf that exists.
 */
export default function ApplyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <BrandLogo variant="ink" height={28} />
        <h1 className="mt-4 font-display text-2xl text-ink">Sell on CADO</h1>
        <p className="mt-1 text-sm text-muted">
          Tell us about your store. We review every application and email you — usually within a day.
        </p>
        <ApplyForm />
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Already have a store account?{" "}
        <a href="/login" className="font-medium text-ribbon">
          Log in
        </a>
      </p>
    </main>
  );
}
