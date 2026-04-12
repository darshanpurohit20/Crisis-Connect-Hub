import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateGuestSession, useCreateCall } from "@workspace/api-client-react";
import { LANGUAGES } from "@/lib/utils";

export default function CallerEntry() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState("");

  const createGuest = useCreateGuestSession();
  const createCall = useCreateCall();

  const loading = createGuest.isPending || createCall.isPending;

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name"); return; }
    setError("");

    try {
      const session = await createGuest.mutateAsync({ data: { name: name.trim(), language } });
      localStorage.setItem("caller_session", JSON.stringify(session));

      const call = await createCall.mutateAsync({ data: { callerId: session.callerId, callerName: session.name, language } });
      navigate(`/caller/call/${call.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <a href="/" className="flex items-center gap-2 mb-10 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to home
        </a>

        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.7a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.5a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Talk to a counsellor</h1>
              <p className="text-xs text-muted-foreground">Anonymous and confidential</p>
            </div>
          </div>

          <div className="my-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-primary font-medium">AI assistance notice:</span> This call is assisted by AI tools that help your counsellor listen better. The AI never speaks to you directly. You can opt out at any time.
            </p>
          </div>

          <form onSubmit={handleStart} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">What can we call you?</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name or any alias"
                className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preferred language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              >
                {Object.entries(LANGUAGES).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Connecting..." : "Start a Call"}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            No account needed. Your session is temporary and private.
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">In immediate danger?</p>
          <p className="text-sm font-semibold">Call 112 (Emergency) or iCall: 9152987821</p>
        </div>
      </div>
    </div>
  );
}
