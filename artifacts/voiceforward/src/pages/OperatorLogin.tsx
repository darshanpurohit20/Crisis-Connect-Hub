import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLoginOperator } from "@workspace/api-client-react";

export default function OperatorLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useLoginOperator();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const session = await login.mutateAsync({ data: { email, password } });
      localStorage.setItem("operator_session", JSON.stringify(session));
      navigate("/operator/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to home
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-primary-foreground" />
            </div>
            <span className="font-bold text-xl">VoiceForward</span>
          </div>
          <p className="text-muted-foreground text-sm">Operator portal</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <h1 className="text-xl font-bold mb-1">Sign in to your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Access the operator dashboard and call queue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@helpline.in"
                required
                className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{error}</div>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {login.isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              New counsellor?{" "}
              <Link href="/operator/register" className="text-primary hover:underline font-medium">Register your account</Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Demo accounts: priya@helpline.in, arjun@vandrevala.org (any password)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
