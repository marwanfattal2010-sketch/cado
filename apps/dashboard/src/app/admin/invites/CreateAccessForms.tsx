"use client";

import { useActionState } from "react";
import {
  createStoreWithOwner,
  addOwnerToStore,
  createAdminAccount,
  type AccessState,
} from "./createActions";
import { Card } from "@/components/ui";

/**
 * Three ways to give someone access. Each shows the new password ONCE, right
 * after creating the account — the admin copies it and passes it on. It is
 * never emailed and never shown again, and the panel says so, because a
 * password box that quietly disappears on refresh is how people get locked out.
 */

const input =
  "min-h-[42px] w-full rounded-card border border-line bg-canvas px-3 text-sm text-ink disabled:opacity-50";
const label = "mb-1 block text-xs font-medium text-muted";
const button =
  "min-h-[42px] rounded-pill bg-ribbon px-5 text-sm font-semibold text-white disabled:opacity-50";

function Result({ state }: { state: AccessState }) {
  if (state.error) {
    return (
      <p className="mt-3 rounded-card bg-status-red-tint px-3 py-2 text-sm text-status-red">{state.error}</p>
    );
  }
  if (!state.success) return null;
  return (
    <div className="mt-3 rounded-card border border-status-green bg-status-green-tint p-3">
      <p className="text-sm font-semibold text-status-green">{state.success}</p>
      {state.password ? (
        <div className="mt-2 rounded-card bg-surface p-3">
          <p className="text-xs text-muted">Send them these two things:</p>
          <p className="mt-1 text-sm">
            <span className="text-muted">Email:</span>{" "}
            <span className="font-mono font-semibold text-ink">{state.email}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted">Password:</span>{" "}
            <span className="select-all font-mono text-base font-bold tracking-wide text-ink">
              {state.password}
            </span>
          </p>
          <p className="mt-2 text-xs text-muted">
            Shown once — it is not emailed and you cannot see it again. Copy it now, and tell them to
            change it under Settings once they sign in. If it is lost, come back and create a new
            password for them.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------- new store + owner ---------- */

export function NewStoreForm() {
  const [state, action, pending] = useActionState(createStoreWithOwner, {} as AccessState);
  return (
    <Card title="Add a new store">
      <p className="mb-3 text-xs text-muted">
        Creates the shop and its owner&rsquo;s login together. The shop goes live on CADO straight
        away — you can pause it any time from its store page.
      </p>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Shop name</label>
          <input name="storeName" required disabled={pending} className={input} placeholder="Zahar" />
        </div>
        <div>
          <label className={label}>City</label>
          <input name="city" disabled={pending} className={input} placeholder="Tripoli" />
        </div>
        <div>
          <label className={label}>Owner&rsquo;s name</label>
          <input name="ownerName" required disabled={pending} className={input} />
        </div>
        <div>
          <label className={label}>Owner&rsquo;s email (this is their login)</label>
          <input name="email" type="email" required disabled={pending} className={input} />
        </div>
        <div>
          <label className={label}>WhatsApp / phone</label>
          <input name="phone" disabled={pending} className={input} />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className={button}>
            {pending ? "Creating…" : "Create shop and login"}
          </button>
        </div>
      </form>
      <Result state={state} />
    </Card>
  );
}

/* ------------------------------------ another login for an existing shop -- */

export function AddOwnerForm({ partners }: { partners: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addOwnerToStore, {} as AccessState);
  return (
    <Card title="Add someone to an existing store">
      <p className="mb-3 text-xs text-muted">
        A second person for a shop that already exists. Staff can work on orders and products but
        cannot change payout details or add other people.
      </p>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label}>Store</label>
          <select name="partnerId" required disabled={pending} className={input}>
            <option value="">Choose a store…</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Their name</label>
          <input name="ownerName" required disabled={pending} className={input} />
        </div>
        <div>
          <label className={label}>Their email (this is their login)</label>
          <input name="email" type="email" required disabled={pending} className={input} />
        </div>
        <div>
          <label className={label}>WhatsApp / phone</label>
          <input name="phone" disabled={pending} className={input} />
        </div>
        <div>
          <label className={label}>Access level</label>
          <select name="storeRole" defaultValue="staff" disabled={pending} className={input}>
            <option value="staff">Staff — orders and products</option>
            <option value="owner">Owner — everything, including bank details</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className={button}>
            {pending ? "Creating…" : "Create their login"}
          </button>
        </div>
      </form>
      <Result state={state} />
    </Card>
  );
}

/* ----------------------------------------------------- new CADO admin ---- */

export function NewAdminForm() {
  const [state, action, pending] = useActionState(createAdminAccount, {} as AccessState);
  return (
    <Card title="Add a CADO admin">
      <p className="mb-3 text-xs text-muted">
        An admin sees every store, every order and all the money, and can add other admins. Only do
        this for someone you trust completely.
      </p>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Their name</label>
          <input name="fullName" required disabled={pending} className={input} />
        </div>
        <div>
          <label className={label}>Their email (this is their login)</label>
          <input name="email" type="email" required disabled={pending} className={input} />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className={button}>
            {pending ? "Creating…" : "Create admin login"}
          </button>
        </div>
      </form>
      <Result state={state} />
    </Card>
  );
}
