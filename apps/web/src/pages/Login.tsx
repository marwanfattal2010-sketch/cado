import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-24">
      <h1 className="font-display text-3xl">Log in</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
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
