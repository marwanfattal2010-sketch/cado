import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "../components/Skeleton";
import { Button, ButtonLink } from "../components/ui";

const FIELD =
  "mt-3 w-full rounded-card border border-line bg-surface px-4 py-3.5 text-body outline-none transition focus:border-ink/35";

export function Settings() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  // The auth context only carries full_name, so the phone has to be read
  // here. Without it the form posted an empty string and quietly wiped the
  // customer's saved phone number every time they edited their name.
  const details = useQuery({
    queryKey: ["profile", "settings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId as string)
        .single();
      if (error) throw error;
      return data as { full_name: string | null; phone: string | null };
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form once the real values land, not from a value that may still
  // have been null on first render.
  useEffect(() => {
    if (!details.data) return;
    setFullName(details.data.full_name ?? "");
    setPhone(details.data.phone ?? "");
  }, [details.data]);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Settings</h1>
        <p className="mt-2 text-body text-muted">Log in to manage your account.</p>
        <ButtonLink to="/login" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  const save = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim().slice(0, 100), phone: phone.trim().slice(0, 30) })
        .eq("id", session.user.id);
      if (error) throw error;
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <h1 className="font-display text-h1">Settings</h1>

      {details.isLoading ? (
        <div className="mt-7">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-[52px] w-full" />
          <Skeleton className="mt-5 h-4 w-20" />
          <Skeleton className="mt-3 h-[52px] w-full" />
          <Skeleton className="mt-5 h-4 w-16" />
          <Skeleton className="mt-3 h-[52px] w-full" />
        </div>
      ) : (
        <div className="animate-fade-in">
          <section className="mt-7">
            <p className="text-body font-medium">Full name</p>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              aria-label="Full name"
              autoComplete="name"
              maxLength={100}
              className={FIELD}
            />
          </section>

          <section className="mt-5">
            <p className="text-body font-medium">Phone</p>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone number"
              aria-label="Phone number"
              autoComplete="tel"
              inputMode="tel"
              maxLength={30}
              className={FIELD}
            />
            <p className="mt-1.5 text-caption text-muted">
              We use it to reach you about a delivery, and nothing else.
            </p>
          </section>

          <section className="mt-5">
            <p className="text-body font-medium">Email</p>
            <p className="mt-3 rounded-card bg-surface-sunk px-4 py-3.5 text-body text-muted">
              {session.user.email}
            </p>
          </section>

          {error ? (
            <p role="alert" className="mt-4 text-body text-alert">
              {error}
            </p>
          ) : null}
          {saved ? <p className="mt-4 text-body text-today">Saved.</p> : null}

          <Button onClick={save} disabled={saving} fullWidth className="mt-7">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
