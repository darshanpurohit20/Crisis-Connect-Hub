import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegisterOperator } from "@workspace/api-client-react";
import { LANGUAGES } from "@/lib/utils";

const LANG_CODES = Object.keys(LANGUAGES);

export default function OperatorRegister() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "", organization: "" });
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["en"]);
  const [error, setError] = useState("");
  const register = useRegisterOperator();

  function toggleLang(code: string) {
    setSelectedLangs(prev =>
      prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedLangs.length === 0) { setError("Select at least one language"); return; }
    setError("");
    try {
      const session = await register.mutateAsync({
        data: { ...form, languages: selectedLangs }
      });
      localStorage.setItem("operator_session", JSON.stringify(session));
      navigate("/operator/dashboard");
    } catch {
      setError("Registration failed. Email may already be in use.");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
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
          <p className="text-muted-foreground text-sm">Register as a crisis helpline operator</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <h1 className="text-xl font-bold mb-1">Create your operator account</h1>
          <p className="text-sm text-muted-foreground mb-6">Join VoiceForward and start taking calls with AI assistance</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="Dr. Priya Sharma" className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email address</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required placeholder="you@helpline.in" className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required placeholder="••••••••" className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Organization</label>
              <input type="text" value={form.organization} onChange={e => setForm(f => ({...f, organization: e.target.value}))} required placeholder="iCall Mental Health" className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Languages you can support</label>
              <div className="flex flex-wrap gap-2">
                {LANG_CODES.filter(c => c !== "mixed").map(code => (
                  <button
                    type="button"
                    key={code}
                    onClick={() => toggleLang(code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedLangs.includes(code) ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                  >
                    {LANGUAGES[code]}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={register.isPending} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {register.isPending ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/operator/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
