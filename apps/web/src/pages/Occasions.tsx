import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Chip, RibbonEmpty, Sheet } from "../components/ui";
import {
  useAddOccasion,
  useDeleteOccasion,
  useOccasions,
  type OccasionReminder,
} from "../hooks/useOccasions";
import {
  OCCASION_TYPES,
  RELATIONSHIPS,
  countdownLabel,
  daysUntil,
  formatEventDate,
  isSoon,
  occasionTitle,
  yearsOn,
  type OccasionType,
} from "../lib/occasions";

const FIELD =
  "w-full rounded-card border border-line bg-surface px-4 py-3 text-body outline-none focus:border-ink/35";

/** Map a saved relationship onto a Gift Finder recipient, when one fits. */
const RECIPIENT_FOR: Record<string, string> = {
  Mom: "mother",
  Dad: "father",
  Partner: "partner",
  Friend: "friend",
  Kid: "child",
  Sister: "her",
  Brother: "him",
};

function OccasionRow({ o, onDelete }: { o: OccasionReminder; onDelete: () => void }) {
  const days = daysUntil(o.event_date);
  const soon = isSoon(days);
  const years = yearsOn(o.event_date);
  const recipient = o.relationship ? RECIPIENT_FOR[o.relationship] : undefined;

  return (
    <div className="rounded-card bg-surface p-4 shadow-rest">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-product-name">{occasionTitle(o)}</p>
          <p className="mt-0.5 text-caption text-muted">
            {formatEventDate(o.event_date)}
            {o.occasion_type === "anniversary" && years > 0 ? ` · ${years} years` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-pill px-2.5 py-1 text-caption font-medium ${
            soon ? "bg-ribbon-tint text-ribbon" : "bg-surface-sunk text-muted"
          }`}
        >
          {countdownLabel(days)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {/* Only offer to shop when it's actually close. A "buy now" button
            eleven months out is just noise. */}
        {soon ? (
          <Link
            to={`/gift-finder${recipient ? `?recipient=${recipient}` : ""}`}
            className="inline-flex h-9 items-center rounded-pill bg-ribbon px-4 text-caption font-medium text-inverse"
          >
            Find a gift
          </Link>
        ) : null}
        <button onClick={onDelete} className="text-caption text-muted underline">
          Remove
        </button>
      </div>
    </div>
  );
}

export function Occasions() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const occasions = useOccasions();
  const addOccasion = useAddOccasion();
  const deleteOccasion = useDeleteOccasion();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    person_name: "",
    relationship: "" as string,
    occasion_type: "birthday" as OccasionType,
    label: "",
    event_date: "",
    remind_days_before: 7,
  });

  // The order-confirmed screen links here with the recipient already known.
  useEffect(() => {
    if (params.get("add") !== "1") return;
    setForm((f) => ({
      ...f,
      person_name: params.get("name") ?? f.person_name,
      occasion_type: (params.get("type") as OccasionType) ?? f.occasion_type,
    }));
    setOpen(true);
    const next = new URLSearchParams(params);
    ["add", "name", "type"].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-h1">Occasions</h1>
        <p className="mt-2 text-body text-muted">Log in to save the dates you don't want to miss.</p>
        <Link
          to="/login"
          className="mt-6 inline-flex h-[52px] items-center rounded-pill bg-ribbon px-8 text-body font-medium text-inverse"
        >
          Log in
        </Link>
      </div>
    );
  }

  const items = occasions.data ?? [];

  const submit = async () => {
    setError(null);
    if (!form.person_name.trim()) return setError("Who is it for?");
    if (!form.event_date) return setError("Pick the date.");
    try {
      await addOccasion.mutateAsync({
        person_name: form.person_name,
        relationship: form.relationship || null,
        occasion_type: form.occasion_type,
        label: form.occasion_type === "other" ? form.label : null,
        event_date: form.event_date,
        remind_days_before: form.remind_days_before,
      });
      setOpen(false);
      setForm({
        person_name: "",
        relationship: "",
        occasion_type: "birthday",
        label: "",
        event_date: "",
        remind_days_before: 7,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-h1">Occasions</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-10 items-center rounded-pill bg-ink px-4 text-caption font-medium text-inverse"
        >
          Add a date
        </button>
      </div>
      <p className="mt-1.5 text-body text-muted">
        The dates you don't want to miss. We'll remind you before each one.
      </p>

      {occasions.isLoading ? (
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-card" />
          ))}
        </div>
      ) : occasions.isError ? (
        // Don't render "no dates saved" when the truth is we couldn't read
        // them — that reads as data loss to someone who saved dates before.
        <div className="mt-6 rounded-card bg-surface p-4 text-center shadow-rest">
          <p className="text-body">We couldn't load your dates just now.</p>
          <button
            onClick={() => occasions.refetch()}
            className="mt-3 inline-flex h-10 items-center rounded-pill bg-ink px-5 text-caption font-medium text-inverse"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="py-14 text-center">
          <RibbonEmpty className="mx-auto h-14 w-14" />
          <p className="mt-3 font-display text-h2">No dates saved yet</p>
          <p className="mx-auto mt-2 max-w-xs text-body text-muted">
            Add a birthday once and you'll never be the person who forgot.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-ribbon px-7 text-body font-medium text-inverse"
          >
            Add your first date
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {items.map((o) => (
            <OccasionRow key={o.id} o={o} onDelete={() => deleteOccasion.mutate(o.id)} />
          ))}
        </div>
      )}

      {/* Reminders are stored but not yet delivered. Say that here rather
          than letting the list imply a message will arrive. */}
      {items.length > 0 ? (
        <p className="mt-5 rounded-card bg-surface-sunk px-3 py-2 text-caption text-muted">
          Reminder sending isn't switched on yet — your dates are saved, and the countdown here is live.
        </p>
      ) : null}

      <Sheet open={open} onClose={() => setOpen(false)} title="Add a date">
        <div className="flex flex-col gap-3">
          <input
            className={FIELD}
            placeholder="Their name"
            value={form.person_name}
            onChange={(e) => setForm({ ...form, person_name: e.target.value })}
          />

          <div>
            <p className="mb-2 text-caption text-muted">What is it?</p>
            <div className="flex flex-wrap gap-2">
              {OCCASION_TYPES.map((t) => (
                <Chip
                  key={t.value}
                  active={form.occasion_type === t.value}
                  onClick={() => setForm({ ...form, occasion_type: t.value })}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>

          {form.occasion_type === "other" ? (
            <input
              className={FIELD}
              placeholder="Name it — graduation, new job…"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          ) : null}

          <div>
            <p className="mb-2 text-caption text-muted">Date</p>
            <input
              type="date"
              className={FIELD}
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>

          <div>
            <p className="mb-2 text-caption text-muted">Who are they to you? (optional)</p>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => (
                <Chip
                  key={r}
                  active={form.relationship === r}
                  onClick={() => setForm({ ...form, relationship: form.relationship === r ? "" : r })}
                  className="!h-8 !px-3 !text-caption"
                >
                  {r}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-caption text-muted">Remind me</p>
            <div className="flex flex-wrap gap-2">
              {[3, 7, 14].map((d) => (
                <Chip
                  key={d}
                  active={form.remind_days_before === d}
                  onClick={() => setForm({ ...form, remind_days_before: d })}
                  className="!h-8 !px-3 !text-caption"
                >
                  {d} days before
                </Chip>
              ))}
            </div>
          </div>

          {error ? <p className="text-caption text-alert">{error}</p> : null}

          <button
            onClick={submit}
            disabled={addOccasion.isPending}
            className="mt-1 inline-flex h-[52px] w-full items-center justify-center rounded-pill bg-ribbon text-body font-medium text-inverse disabled:opacity-40"
          >
            {addOccasion.isPending ? "Saving…" : "Save date"}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
