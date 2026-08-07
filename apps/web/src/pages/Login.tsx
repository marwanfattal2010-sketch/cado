import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { GoogleIcon } from "../components/Icons";

export function Login() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
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
      setError(err instanceof Error ? err.message : "Could not sign in with Google");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-24">
      <h1 className="font-display text-3xl">Log in</h1>

      <button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-ink/15 py-3 text-sm font-medium disabled:opacity-50"
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
          className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm outline-none focus:border-ink/40"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm outline-none focus:border-ink/40"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-ink py-3 text-sm tracking-wide text-cream disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink/50">
        Don't have an account?{" "}
        <Link to="/signup" className="font-medium text-ink">
          Sign up
        </Link>
      </p>
    </div>
  );
}
