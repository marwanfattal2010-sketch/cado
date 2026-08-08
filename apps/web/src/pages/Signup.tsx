import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { GoogleIcon } from "../components/Icons";

export function Signup() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { needsEmailConfirm } = await signUp(email.trim(), password, fullName.trim());
      if (needsEmailConfirm) {
        setConfirmSent(true);
      } else {
        navigate("/account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign up");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign up with Google");
      setGoogleLoading(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Check your email</h1>
        <p className="mt-4 text-ink/60">We sent a confirmation link to {email}. Confirm it, then log in.</p>
        <Link to="/login" className="mt-8 inline-block rounded-pill bg-ink px-6 py-3 text-sm text-cream">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-24">
      <h1 className="font-display text-3xl">Create account</h1>

      <button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-pill border border-ink/15 py-3 text-sm font-medium disabled:opacity-50"
      >
        <GoogleIcon className="h-5 w-5" />
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-ink/40">
        <div className="h-px flex-1 bg-ink/10" />
        or
        <div className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded-card border border-ink/15 px-4 py-3 text-sm outline-none focus:border-ink/40"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          className="w-full rounded-card border border-ink/15 px-4 py-3 text-sm outline-none focus:border-ink/40"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-card border border-ink/15 px-4 py-3 text-sm outline-none focus:border-ink/40"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-pill bg-ink py-3 text-sm tracking-wide text-cream disabled:opacity-50"
        >
          {submitting ? "Signing up..." : "Sign up"}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink/50">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-ink">
          Log in
        </Link>
      </p>
    </div>
  );
}
