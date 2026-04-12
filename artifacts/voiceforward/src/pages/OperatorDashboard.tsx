import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetQueue, useListOperators, useAssignOperatorToCall, useUpdateCallState,
  useGetCallInsights, useGetCallTranscript, useGetNearbyResources,
  useUpdateOperatorStatus, getGetQueueQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDuration, LANGUAGES, RISK_COLORS, RISK_BG, RISK_SCORE_COLOR } from "@/lib/utils";

interface OperatorSession {
  operatorId: string;
  name: string;
  email: string;
  organization: string;
  languages: string[];
  token: string;
  status: string;
}

interface AIInsight {
  riskLevel: string;
  riskScore: number;
  emotionState: string;
  distressIntensity: number;
  cognitiveCoherence: number;
  agitationLevel: number;
  suicidalIdeationFlag: boolean;
  ambientSounds: string[];
  detectedLanguage: string;
  codeSwitchCount: number;
  recommendedAction: string;
  reasoningChain: string;
  confidence: number;
  uncertaintyFlags: string[];
  operatorFatigueScore: number;
}

function RiskGauge({ score, level }: { score: number; level: string }) {
  const color = RISK_SCORE_COLOR[level] || "#34d399";
  const pct = Math.min(score, 1);
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(220 26% 18%)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="40" fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-black" style={{ color }}>{Math.round(pct * 100)}</div>
          <div className="text-xs text-muted-foreground">risk</div>
        </div>
      </div>
      <div className={cn("text-xs font-bold uppercase tracking-widest mt-2 px-3 py-1 rounded-full border", RISK_BG[level] || RISK_BG.low, RISK_COLORS[level] || "")}>
        {level}
      </div>
    </div>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-0.5 h-8">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className={cn("w-0.5 rounded-full transition-all", active ? "bg-primary waveform-bar" : "bg-border")}
          style={{ height: active ? undefined : "4px" }}
        />
      ))}
    </div>
  );
}

export default function OperatorDashboard() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const sessionRaw = localStorage.getItem("operator_session");
  const session: OperatorSession | null = sessionRaw ? JSON.parse(sessionRaw) : null;

  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [liveInsight, setLiveInsight] = useState<AIInsight | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showReasoning, setShowReasoning] = useState(false);
  const [activeTab, setActiveTab] = useState<"insights" | "resources">("insights");
  const [isMuted, setIsMuted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: queue, refetch: refetchQueue } = useGetQueue({ query: { refetchInterval: 3000 } });
  const { data: operators } = useListOperators({ query: { refetchInterval: 5000 } });
  const assignOp = useAssignOperatorToCall();
  const updateState = useUpdateCallState();
  const updateStatus = useUpdateOperatorStatus();

  const { data: callInsights } = useGetCallInsights(activeCallId || "", {
    query: { enabled: !!activeCallId, refetchInterval: 5000 }
  });
  const { data: transcript } = useGetCallTranscript(activeCallId || "", {
    query: { enabled: !!activeCallId, refetchInterval: 3000 }
  });
  const { data: resources } = useGetNearbyResources(activeCallId || "", {
    query: { enabled: !!activeCallId }
  });

  useEffect(() => {
    if (!session) { navigate("/operator/login"); return; }
  }, []);

  useEffect(() => {
    if (!activeCallId) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
      return;
    }

    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws?callId=${activeCallId}&role=operator`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "ai_insight") {
          setLiveInsight(msg.data as AIInsight);
        }
      } catch {}
    };

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    return () => {
      ws.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCallId]);

  async function pickUpCall(callId: string) {
    if (!session) return;
    await assignOp.mutateAsync({ callId, data: { operatorId: session.operatorId } });
    setActiveCallId(callId);
    setElapsed(0);
    refetchQueue();
  }

  async function holdCall() {
    if (!activeCallId) return;
    await updateState.mutateAsync({ callId: activeCallId, data: { state: "on_hold" } });
    setActiveCallId(null);
    refetchQueue();
  }

  async function endCall() {
    if (!activeCallId) return;
    await updateState.mutateAsync({ callId: activeCallId, data: { state: "ended" } });
    setActiveCallId(null);
    setLiveInsight(null);
    refetchQueue();
  }

  async function handleLogout() {
    if (session) {
      await updateStatus.mutateAsync({ operatorId: session.operatorId, data: { status: "offline" } });
    }
    localStorage.removeItem("operator_session");
    navigate("/operator/login");
  }

  const activeCall = queue?.calls.find(c => c.id === activeCallId);
  const waitingCalls = queue?.calls.filter(c => c.state === "waiting" || c.state === "caller_connected") || [];
  const activeCalls = queue?.calls.filter(c => c.state === "active" || c.state === "on_hold") || [];
  const insight = liveInsight || (callInsights ? {
    riskLevel: callInsights.riskLevel,
    riskScore: callInsights.riskScore,
    emotionState: callInsights.emotionState,
    distressIntensity: callInsights.distressIntensity,
    cognitiveCoherence: callInsights.cognitiveCoherence,
    agitationLevel: callInsights.agitationLevel,
    suicidalIdeationFlag: callInsights.suicidalIdeationFlag,
    ambientSounds: callInsights.ambientSounds,
    detectedLanguage: callInsights.detectedLanguage,
    codeSwitchCount: callInsights.codeSwitchCount,
    recommendedAction: callInsights.recommendedAction,
    reasoningChain: callInsights.reasoningChain,
    confidence: callInsights.confidence,
    uncertaintyFlags: callInsights.uncertaintyFlags,
    operatorFatigueScore: callInsights.operatorFatigueScore,
  } as AIInsight : null);

  if (!session) return null;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top nav */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground animate-pulse-ring" />
          </div>
          <span className="font-bold text-sm tracking-tight">VoiceForward</span>
          <span className="text-muted-foreground text-xs">|</span>
          <span className="text-xs text-muted-foreground">Operator HUD</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/operator/dashboard/insights" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Analytics</Link>
          <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full", wsConnected && activeCallId ? "bg-emerald-400/10 text-emerald-400" : "bg-muted text-muted-foreground")}>
            <span className={cn("w-1.5 h-1.5 rounded-full", wsConnected && activeCallId ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground")} />
            {wsConnected && activeCallId ? "Live" : "Standby"}
          </div>
          <div className="text-xs text-muted-foreground">{session.name}</div>
          <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Sign out</button>
        </div>
      </div>

      {/* Three-pane layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT PANE — Queue */}
        <div className="w-72 border-r border-border flex flex-col overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call Queue</span>
              <div className="flex gap-2 text-xs">
                <span className="text-amber-400 font-bold">{queue?.waitingCount || 0} waiting</span>
                <span className="text-emerald-400 font-bold">{queue?.availableOperators || 0} available</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Waiting calls */}
            {waitingCalls.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground px-1">Waiting</div>
                {waitingCalls.map(call => (
                  <div key={call.id} className="bg-card border border-amber-400/20 rounded-lg p-3 hover:border-amber-400/40 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm">{call.callerName}</div>
                      {call.riskLevel && (
                        <span className={cn("text-xs px-1.5 py-0.5 rounded border", RISK_BG[call.riskLevel], RISK_COLORS[call.riskLevel])}>{call.riskLevel}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground">{LANGUAGES[call.language] || call.language}</span>
                    </div>
                    <button
                      onClick={() => pickUpCall(call.id)}
                      disabled={!!activeCallId || assignOp.isPending}
                      className="w-full text-xs py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md font-medium transition-colors disabled:opacity-40"
                    >
                      Pick up call
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Active calls */}
            {activeCalls.length > 0 && (
              <div className="space-y-2 mt-3">
                <div className="text-xs font-medium text-muted-foreground px-1">Active / On Hold</div>
                {activeCalls.map(call => (
                  <div
                    key={call.id}
                    onClick={() => call.state === "on_hold" && !activeCallId && setActiveCallId(call.id)}
                    className={cn("rounded-lg p-3 border transition-colors cursor-pointer", call.id === activeCallId ? "bg-primary/10 border-primary/40" : "bg-card border-border hover:border-border/80")}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{call.callerName}</div>
                        <div className="text-xs text-muted-foreground">{call.operatorName || "Unassigned"}</div>
                      </div>
                      <div className={cn("text-xs px-1.5 py-0.5 rounded-full", call.state === "on_hold" ? "bg-amber-400/10 text-amber-400" : "bg-emerald-400/10 text-emerald-400")}>
                        {call.state === "on_hold" ? "On hold" : "Active"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {waitingCalls.length === 0 && activeCalls.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.7"/><path d="M1 1l22 22"/></svg>
                </div>
                <div className="text-sm">No calls in queue</div>
              </div>
            )}
          </div>

          {/* Operators online */}
          <div className="border-t border-border p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Operators</div>
            <div className="space-y-1">
              {operators?.slice(0, 4).map(op => (
                <div key={op.id} className="flex items-center gap-2 text-xs">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", op.status === "available" ? "bg-emerald-400" : op.status === "busy" ? "bg-amber-400" : "bg-muted-foreground")} />
                  <span className="truncate text-muted-foreground">{op.name}</span>
                  <span className="ml-auto text-muted-foreground/60 shrink-0">{op.callsHandled}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE PANE — Active Call */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {activeCall ? (
            <>
              {/* Call header */}
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center font-bold text-primary">
                    {activeCall.callerName[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{activeCall.callerName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{LANGUAGES[activeCall.language] || activeCall.language}</span>
                      <span>·</span>
                      <span className={cn("font-mono", activeCall.state === "on_hold" ? "text-amber-400" : "text-emerald-400")}>
                        {activeCall.state === "on_hold" ? "On hold" : formatDuration(elapsed)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs bg-muted/40 px-2.5 py-1.5 rounded-md text-muted-foreground">
                    AI disclosure: active
                  </div>
                  <button
                    onClick={() => setIsMuted(m => !m)}
                    className={cn("w-9 h-9 rounded-lg border flex items-center justify-center transition-colors", isMuted ? "bg-destructive/20 border-destructive text-destructive" : "border-border text-muted-foreground hover:text-foreground")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  </button>
                  <button onClick={holdCall} className="text-xs px-3 py-1.5 border border-amber-400/40 text-amber-400 rounded-md hover:bg-amber-400/10 transition-colors">Hold</button>
                  <button onClick={endCall} className="text-xs px-3 py-1.5 bg-destructive/10 border border-destructive/30 text-destructive rounded-md hover:bg-destructive/20 transition-colors">End call</button>
                </div>
              </div>

              {/* Transcript */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Live Transcript</div>
                {(!transcript || transcript.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">Transcript will appear as the conversation progresses</div>
                )}
                {transcript?.map((seg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", seg.speaker === "operator" && "flex-row-reverse")}>
                    <div className={cn("px-3 py-2 rounded-xl text-sm max-w-xs", seg.speaker === "caller" ? "bg-card border border-border" : "bg-primary/10 border border-primary/20 text-right")}>
                      <div className={cn("text-xs font-medium mb-0.5", seg.speaker === "caller" ? "text-muted-foreground" : "text-primary")}>
                        {seg.speaker === "caller" ? "Caller" : "You"}
                        {seg.isCodeSwitch && <span className="ml-1 text-accent">· code-switch</span>}
                      </div>
                      <div>{seg.text}</div>
                      <div className="text-xs text-muted-foreground mt-1 opacity-60">{LANGUAGES[seg.language] || seg.language}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Waveform */}
              <div className="border-t border-border px-5 py-3">
                <Waveform active={activeCall.state === "active" && !isMuted} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.7a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.5a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <h2 className="font-semibold text-lg mb-2">No active call</h2>
                <p className="text-sm text-muted-foreground max-w-xs">Pick up a call from the queue on the left to start an active session. AI insights will appear in real-time.</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE — AI Intelligence */}
        <div className="w-80 border-l border-border flex flex-col overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Intelligence</span>
            {activeCallId && (
              <div className="flex gap-1">
                <button onClick={() => setActiveTab("insights")} className={cn("text-xs px-2.5 py-1 rounded transition-colors", activeTab === "insights" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>Insights</button>
                <button onClick={() => setActiveTab("resources")} className={cn("text-xs px-2.5 py-1 rounded transition-colors", activeTab === "resources" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>Resources</button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {!activeCallId ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                AI insights appear when a call is active
              </div>
            ) : activeTab === "insights" ? (
              <>
                {/* Risk gauge */}
                {insight && (
                  <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center">
                    <RiskGauge score={insight.riskScore} level={insight.riskLevel} />
                  </div>
                )}

                {/* Emotion state */}
                {insight && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emotion State</div>
                    <div className="font-semibold capitalize mb-2">{insight.emotionState}</div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Distress</span><span>{Math.round(insight.distressIntensity * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div className="h-full rounded-full bg-destructive" animate={{ width: `${insight.distressIntensity * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Coherence</span><span>{Math.round(insight.cognitiveCoherence * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${insight.cognitiveCoherence * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Agitation</span><span>{Math.round(insight.agitationLevel * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div className="h-full rounded-full bg-amber-400" animate={{ width: `${insight.agitationLevel * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                      </div>
                    </div>
                    {insight.suicidalIdeationFlag && (
                      <div className="mt-3 text-xs bg-red-400/10 border border-red-400/30 text-red-400 rounded-lg px-3 py-2 font-medium">
                        Suicidal ideation indicators detected — follow protocol
                      </div>
                    )}
                  </div>
                )}

                {/* Language */}
                {insight && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Language</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{LANGUAGES[insight.detectedLanguage] || insight.detectedLanguage}</span>
                      <span className="text-xs text-muted-foreground">{insight.codeSwitchCount} code-switch{insight.codeSwitchCount !== 1 ? "es" : ""}</span>
                    </div>
                    {insight.ambientSounds.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1.5">Ambient audio detected</div>
                        <div className="flex flex-wrap gap-1">
                          {insight.ambientSounds.map((s, i) => (
                            <span key={i} className="text-xs bg-muted/50 border border-border rounded-full px-2 py-0.5">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recommended action */}
                {insight && (
                  <div className="bg-card border border-primary/30 rounded-xl p-4">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Recommended Action</div>
                    <p className="text-sm leading-relaxed mb-3">{insight.recommendedAction}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 text-xs py-1.5 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 rounded-md font-medium hover:bg-emerald-400/20 transition-colors">Accept</button>
                      <button className="flex-1 text-xs py-1.5 border border-border text-muted-foreground rounded-md font-medium hover:text-foreground transition-colors">Modify</button>
                      <button className="flex-1 text-xs py-1.5 border border-destructive/30 text-destructive rounded-md font-medium hover:bg-destructive/10 transition-colors">Reject</button>
                    </div>
                    <button onClick={() => setShowReasoning(r => !r)} className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors flex items-center gap-1">
                      <span>{showReasoning ? "Hide" : "Show"} reasoning</span>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d={showReasoning ? "M2 6l3-3 3 3" : "M2 4l3 3 3-3"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {showReasoning && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 leading-relaxed">
                        {insight.reasoningChain}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Confidence + uncertainty */}
                {insight && (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confidence</span>
                      <span className="text-sm font-bold">{Math.round(insight.confidence * 100)}%</span>
                    </div>
                    {insight.uncertaintyFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {insight.uncertaintyFlags.map((f, i) => (
                          <span key={i} className="text-xs bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-full px-2 py-0.5">{f.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Operator fatigue</span>
                        <span>{Math.round(insight.operatorFatigueScore * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-muted-foreground/50" style={{ width: `${insight.operatorFatigueScore * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Resources tab */
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nearby Resources</div>
                {resources?.map((r) => (
                  <div key={r.id} className="bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-medium text-sm">{r.name}</div>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0 ml-2", r.isOpen24h ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400" : "bg-muted border-border text-muted-foreground")}>
                        {r.isOpen24h ? "24h" : "Limited"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{r.type} · {r.distance.toFixed(1)} km</div>
                    <div className="text-xs text-muted-foreground truncate">{r.address}</div>
                    {r.phone && (
                      <div className="text-xs text-primary mt-1 font-mono">{r.phone}</div>
                    )}
                    <button className="mt-2 w-full text-xs py-1 border border-primary/30 text-primary rounded-md hover:bg-primary/10 transition-colors">Dispatch to caller</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
