import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { signIn } = useAuth();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold">CADO</h1>
        <p className="mb-6 text-sm text-gray-500">Partner &amp; admin portal</p>

        <input
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error ? <p className="mb-2 text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded-lg bg-black py-2 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
