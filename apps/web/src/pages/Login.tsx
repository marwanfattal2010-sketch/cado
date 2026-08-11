import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { GoogleIcon } from "../components/Icons";
import { Button } from "../components/ui";

const FIELD =
  "w-full rounded-card border border-line bg-surface px-4 py-3.5 text-body outline-none transition focus:border-ink/35";

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
      setError(err instanceof Error ? err.message : "Could not log you in.");
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
      setError(err instanceof Error ? err.message : "Could not log you in with Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-20">
      <h1 className="font-display text-h1">Log in</h1>

      <Button
        type="button"
        onClick={onGoogle}
        disabled={googleLoading}
        variant="secondary"
        fullWidth
        className="mt-8"
      >
        <GoogleIcon className="h-5 w-5" />
        {googleLoading ? "Taking you to Google…" : "Continue with Google"}
      </Button>

      <div className="my-6 flex items-center gap-3 text-caption text-muted">
        <div className="h-px flex-1 bg-line" />
        or
        <div className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className={FIELD}
          type="email"
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={FIELD}
          type="password"
          placeholder="Password"
          aria-label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-body text-alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? "Logging you in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-body text-muted">
        No account yet?{" "}
        <Link to="/signup" className="font-medium text-ink underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
