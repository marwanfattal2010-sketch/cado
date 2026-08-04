import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export function Settings() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-ink/50">Log in to manage your account.</p>
        <Link to="/login" className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm text-cream">
          Log in
        </Link>
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
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>

      <section className="mt-7">
        <p className="text-sm font-medium">Full name</p>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          className="mt-3 w-full rounded-2xl border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
        />
      </section>

      <section className="mt-5">
        <p className="text-sm font-medium">Phone</p>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Your phone number"
          maxLength={30}
          className="mt-3 w-full rounded-2xl border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
        />
      </section>

      <section className="mt-5">
        <p className="text-sm font-medium">Email</p>
        <p className="mt-3 rounded-2xl bg-ink/5 px-4 py-3 text-sm text-ink/50">{session.user.email}</p>
      </section>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="mt-4 text-sm text-emerald-700">Saved.</p> : null}

      <button
        onClick={save}
        disabled={saving}
        className="mt-7 w-full rounded-full bg-ink py-3.5 text-sm font-medium text-cream disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
