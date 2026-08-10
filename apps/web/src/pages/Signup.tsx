import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { GoogleIcon } from "../components/Icons";
import { Button, ButtonLink } from "../components/ui";

const FIELD =
  "w-full rounded-card border border-line bg-surface px-4 py-3.5 text-body outline-none transition focus:border-ink/35";

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
      // Only shows "check your email" when Supabase actually withheld a
      // session. Showing it unconditionally once locked every new customer
      // out, because email confirmation is off and no mail ever arrived.
      const { needsEmailConfirm } = await signUp(email.trim(), password, fullName.trim());
      if (needsEmailConfirm) {
        setConfirmSent(true);
      } else {
        navigate("/account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
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
      setError(err instanceof Error ? err.message : "Could not sign you up with Google.");
      setGoogleLoading(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Check your email</h1>
        <p className="mt-4 text-body text-muted">
          We sent a confirmation link to {email}. Open it, then log in.
        </p>
        <ButtonLink to="/login" className="mt-8">
          Back to log in
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-20">
      <h1 className="font-display text-h1">Create an account</h1>

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
          placeholder="Full name"
          aria-label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-body text-alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? "Creating your account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-body text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-ribbon underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
