import { Link } from "wouter";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" } }),
};

const layers = [
  { num: "01", title: "Real-Time Multimodal Call Understanding", desc: "Continuous emotion analysis across multiple dimensions — distress intensity, cognitive coherence, agitation, dissociation markers, and suicidal ideation indicators. Ambient audio classification runs in parallel." },
  { num: "02", title: "Multi-Agent Conflict Resolution", desc: "Five specialized agents examine different dimensions simultaneously. When they disagree, the system resolves the conflict and presents a plain-language reasoning chain — never a black-box output." },
  { num: "03", title: "Operator Interface & Cognitive Load Design", desc: "Ambient-first HUD: peripheral visual cues, never interrupting text blocks. Immediate guidance, situational awareness, and resource readiness always visible without competing for attention." },
  { num: "04", title: "Longitudinal Pattern Intelligence", desc: "Every call teaches the system. Insights identify which operator phrases correlate with better outcomes, what call characteristics predict escalation, and which referrals have high follow-through." },
  { num: "05", title: "Ethical Architecture & Accountability", desc: "Every AI recommendation is logged immutably with full reasoning and operator response. DPDPA 2023 compliance: data localisation, right to erasure, caller consent, opt-out without degraded experience." },
];

const stats = [
  { value: "700+", label: "Crisis helplines in India" },
  { value: "0", label: "Using real-time AI assistance" },
  { value: "22", label: "Indian languages supported" },
  { value: "<300ms", label: "AI insight latency" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary-foreground animate-pulse-ring" />
            </div>
            <span className="font-bold text-lg tracking-tight">VoiceForward</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/operator/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Operator Login</Link>
            <Link href="/caller" className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity">Get Help Now</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-primary border border-primary/30 rounded-full px-4 py-1.5 mb-8 bg-primary/5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AI-Augmented Crisis Response Intelligence
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-8">
            Every crisis call deserves a{" "}
            <span className="text-primary">trained human</span>{" "}
            at their best.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12">
            India has 700+ crisis helplines. Zero use real-time AI. VoiceForward changes that — giving operators multilingual transcription, emotion detection, and ambient intelligence so they can focus entirely on the person in front of them.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/caller" className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity text-center">
              I Need Help — Start a Call
            </Link>
            <Link href="/operator/register" className="border border-border bg-card text-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-secondary transition-colors text-center">
              Register as Operator
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border/50 bg-card/50">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
              <div className="text-4xl font-black text-primary mb-2">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-black mb-6">The intelligence distribution problem.</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-card border border-border rounded-xl p-8">
                <div className="text-destructive font-bold text-sm uppercase tracking-wider mb-4">Without VoiceForward</div>
                <p className="text-muted-foreground leading-relaxed">A caller in genuine crisis reaching an exhausted volunteer at 3am in an unfamiliar language is statistically less likely to be helped than the same caller at 2pm. Outcomes are shaped by operator fatigue, language mismatch, and time of day — not by the actual severity of the situation.</p>
              </div>
              <div className="bg-card border border-primary/30 rounded-xl p-8">
                <div className="text-primary font-bold text-sm uppercase tracking-wider mb-4">With VoiceForward</div>
                <p className="text-muted-foreground leading-relaxed">Real-time multilingual transcription, emotional affect detection, ambient audio classification, and resource retrieval — all surfaced as ambient intelligence in the operator's peripheral vision. The AI never speaks to callers. It makes humans dramatically more capable.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5 Layers */}
      <section className="py-24 px-6 bg-card/30 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <motion.h2 custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-3xl md:text-4xl font-black mb-16 text-center">
            Five capability layers.
          </motion.h2>
          <div className="space-y-4">
            {layers.map((layer, i) => (
              <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-card border border-border rounded-xl p-6 flex gap-6 hover:border-primary/40 transition-colors">
                <div className="text-4xl font-black text-primary/30 font-mono shrink-0">{layer.num}</div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{layer.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{layer.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2 custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-3xl md:text-4xl font-black mb-4 text-center">How it works.</motion.h2>
          <motion.p custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">Audio flows from caller to AI pipeline in under 300ms. Eight steps from ring to HUD update.</motion.p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { step: "1", title: "Caller connects", desc: "Browser WebRTC tab or SIM dial-in. MediaStream captured, PCM chunks sent to server." },
              { step: "2", title: "Audio buffered", desc: "FastAPI WebSocket receives 3-second audio windows with 1s overlap via Redis Streams." },
              { step: "3", title: "Multilingual STT", desc: "Sarvam AI transcribes 22 Indian languages with confidence scores and code-switch detection." },
              { step: "4", title: "5 agents analyse", desc: "Emotion, Ambient, Narrative, Language, and OperatorFatigue agents run in parallel." },
              { step: "5", title: "MetaAgent resolves", desc: "Conflicts between agents resolved with transparent reasoning chain. Calibrated uncertainty mandatory." },
              { step: "6", title: "HUD updated", desc: "Server-Sent Events push risk gauge, transcript, recommended action and resources to operator." },
              { step: "7", title: "Location extracted", desc: "NLP entity extraction geocodes location. Overpass API finds hospitals, clinics, police nearby." },
              { step: "8", title: "One-click dispatch", desc: "Operator selects resource. Confirmation modal. Immutable audit log written. Caller notified." },
            ].map((item, i) => (
              <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex gap-4 bg-card border border-border rounded-xl p-5 hover:border-accent/40 transition-colors">
                <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-sm font-bold shrink-0">{item.step}</div>
                <div>
                  <div className="font-semibold mb-1">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="bg-card border border-border rounded-2xl p-12">
            <h2 className="text-3xl font-black mb-4">Ready to use VoiceForward?</h2>
            <p className="text-muted-foreground mb-10">Callers can join anonymously as guests. Operators register and start taking calls immediately.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/caller" className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                I Need to Talk to Someone
              </Link>
              <Link href="/operator/register" className="border border-border bg-background text-foreground px-8 py-4 rounded-lg font-semibold hover:bg-card transition-colors">
                I Am a Counsellor
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary-foreground" />
            </div>
            <span className="font-bold">VoiceForward</span>
          </div>
          <div className="text-sm text-muted-foreground">DPDPA 2023 Compliant — No caller PII retained beyond session</div>
          <div className="text-sm text-muted-foreground">Built for SOC1 Hackathon 2026</div>
        </div>
      </footer>
    </div>
  );
}
