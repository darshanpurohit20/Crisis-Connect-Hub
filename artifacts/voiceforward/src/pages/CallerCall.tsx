import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useGetCall, useUpdateCallState } from "@workspace/api-client-react";
import { formatDuration, LANGUAGES } from "@/lib/utils";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function CallerCall() {
  const { callId } = useParams<{ callId: string }>();
  const [, navigate] = useLocation();
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<{ speaker: string; text: string; timestamp: string }[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [micError, setMicError] = useState<string | null>(null);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(16).fill(4));
  const [operatorJoined, setOperatorJoined] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const makingOfferRef = useRef(false);

  const { data: call } = useGetCall(callId || "", { query: { enabled: !!callId, refetchInterval: 3000 } });
  const updateState = useUpdateCallState();

  // Waveform animation loop from real mic data
  function startWaveform(stream: MediaStream) {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteFrequencyData(data);
      const bars = Array.from({ length: 16 }, (_, i) => {
        const val = data[Math.floor(i * data.length / 16)] || 0;
        return Math.max(4, (val / 255) * 40);
      });
      setWaveHeights(bars);
      animFrameRef.current = requestAnimationFrame(tick);
    }
    tick();
  }

  // Create RTCPeerConnection and add local tracks
  function createPC(ws: WebSocket): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // When we get remote audio, play it
    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Send ICE candidates to operator via WS
    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "webrtc_ice_candidate", candidate: event.candidate }));
      }
    };

    return pc;
  }

  // Caller initiates the offer when operator joins
  const sendOffer = useCallback(async (ws: WebSocket) => {
    if (makingOfferRef.current) return;
    makingOfferRef.current = true;
    try {
      const pc = pcRef.current || createPC(ws);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "webrtc_offer", sdp: pc.localDescription }));
    } catch (err) {
      console.error("Failed to create offer", err);
    } finally {
      makingOfferRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!callId) return;

    // 1. Get microphone
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        localStreamRef.current = stream;
        startWaveform(stream);
        setMicError(null);
      })
      .catch(err => {
        setMicError("Microphone access denied. Please allow microphone access to speak.");
        console.error("getUserMedia failed", err);
      });

    // 2. Connect WebSocket
    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws?callId=${callId}&role=caller`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "participant_joined" && msg.role === "operator") {
          setOperatorJoined(true);
          // Operator joined → caller creates and sends WebRTC offer
          if (localStreamRef.current) {
            createPC(ws);
            await sendOffer(ws);
          }
        }

        if (msg.type === "participant_left" && msg.role === "operator") {
          setOperatorJoined(false);
        }

        if (msg.type === "webrtc_answer") {
          const pc = pcRef.current;
          if (pc && msg.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          }
        }

        if (msg.type === "webrtc_ice_candidate" && msg.candidate) {
          const pc = pcRef.current;
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch {}
          }
        }

        if (msg.type === "transcript") {
          setTranscript(prev => [...prev.slice(-20), {
            speaker: msg.role || "caller",
            text: msg.text,
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      } catch {}
    };

    ws.onclose = () => setWsStatus("disconnected");
    ws.onerror = () => setWsStatus("disconnected");

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    return () => {
      ws.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, [callId]);

  function toggleMute() {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
    }
  }

  async function handleEndCall() {
    if (callId && call) {
      await updateState.mutateAsync({ callId, data: { state: "ended" } });
    }
    wsRef.current?.close();
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    localStorage.removeItem("caller_session");
    navigate("/");
  }

  const isActive = call?.state === "active";
  const isWaiting = !call?.operatorId;
  const lang = LANGUAGES[call?.language || "en"] || "English";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      {/* Hidden audio element for remote operator audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      <div className="w-full max-w-md space-y-4">
        {micError && (
          <div className="bg-destructive/10 border border-destructive/40 text-destructive text-sm rounded-xl px-4 py-3">
            {micError}
          </div>
        )}

        {/* Status card */}
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <div className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full mb-6 ${
            isActive
              ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/30"
              : "bg-amber-400/10 text-amber-400 border border-amber-400/30"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
            {isActive ? "Connected to counsellor" : isWaiting ? "Waiting for a counsellor..." : "Connecting..."}
          </div>

          {isActive && call?.operatorName && (
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/40 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-primary">{call.operatorName[0]}</span>
              </div>
              <div className="font-semibold">{call.operatorName}</div>
              <div className="text-xs text-muted-foreground">Your counsellor</div>
            </div>
          )}

          {/* Live waveform — real mic data */}
          <div className="flex items-center justify-center gap-0.5 h-12 mb-6">
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  !isMuted && wsStatus === "connected" ? "bg-primary" : "bg-border"
                }`}
                style={{ height: `${isMuted ? 4 : h}px` }}
              />
            ))}
          </div>

          <div className="text-3xl font-mono font-bold mb-1">{formatDuration(elapsed)}</div>
          <div className="text-xs text-muted-foreground mb-1">Language: {lang}</div>
          <div className={`text-xs mb-6 ${wsStatus === "connected" ? "text-emerald-400" : "text-muted-foreground"}`}>
            {wsStatus === "connected" ? "● Connected" : wsStatus === "connecting" ? "Connecting..." : "● Disconnected"}
          </div>

          {/* AI disclosure */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 mb-6">
            AI assistance is active on this call — helping your counsellor listen more effectively. The AI does not speak to you.
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-colors ${
                isMuted
                  ? "bg-destructive/20 border-destructive text-destructive"
                  : "border-border hover:border-primary text-muted-foreground hover:text-primary"
              }`}
            >
              {isMuted ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>

            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Transcript</h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {transcript.map((t, i) => (
                <div key={i} className={`text-sm ${t.speaker === "caller" ? "text-foreground" : "text-primary"}`}>
                  <span className="text-xs text-muted-foreground mr-2">{t.timestamp}</span>
                  <span className="font-medium">{t.speaker === "caller" ? "You" : "Counsellor"}:</span> {t.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {isWaiting && (
          <div className="text-center text-sm text-muted-foreground">
            A counsellor will join shortly. Please stay on the line.
          </div>
        )}
      </div>
    </div>
  );
}
