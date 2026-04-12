import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { logger } from "./lib/logger";

interface Client {
  ws: WebSocket;
  callId: string;
  role: "caller" | "operator";
}

const clients = new Map<string, Client[]>();

const AI_SIMULATIONS = [
  { riskLevel: "medium", emotionState: "anxious", distressIntensity: 0.45, recommendedAction: "Acknowledge feelings and use calming language", reasoningChain: "Speech pace increased by 30%, voice pitch elevated — signs of mild anxiety detected" },
  { riskLevel: "high", emotionState: "distressed", distressIntensity: 0.72, recommendedAction: "Stay on the line, do not leave caller alone", reasoningChain: "Caller used phrase 'no one cares' twice. Tone has dropped significantly — potential depressive indicators" },
  { riskLevel: "medium", emotionState: "tearful", distressIntensity: 0.55, recommendedAction: "Validate experience and ask open-ended questions", reasoningChain: "Irregular breathing patterns detected in audio. Language switched to Hindi — comfort language shift" },
  { riskLevel: "low", emotionState: "calm", distressIntensity: 0.2, recommendedAction: "Provide resource information and safety plan", reasoningChain: "Caller is engaging constructively. Risk indicators have decreased over last 3 minutes" },
  { riskLevel: "critical", emotionState: "severely distressed", distressIntensity: 0.9, recommendedAction: "Activate emergency protocol — request location for dispatch", reasoningChain: "CRITICAL: Caller mentioned specific plan. Speaking pace dropped 40% — calm before action indicator. Ambient audio: child crying detected" },
];

let simulationIndex = 0;

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "/", "http://localhost");
    const callId = url.searchParams.get("callId");
    const role = url.searchParams.get("role") as "caller" | "operator" | null;

    if (!callId || !role || !["caller", "operator"].includes(role)) {
      ws.close(1008, "Missing callId or role");
      return;
    }

    const client: Client = { ws, callId, role };

    if (!clients.has(callId)) {
      clients.set(callId, []);
    }
    clients.get(callId)!.push(client);

    logger.info({ callId, role }, "WebSocket client connected");

    ws.send(JSON.stringify({ type: "connected", callId, role }));

    broadcastToCall(callId, { type: "participant_joined", role }, ws);

    let aiInterval: NodeJS.Timeout | null = null;

    if (role === "operator") {
      aiInterval = setInterval(() => {
        const sim = AI_SIMULATIONS[simulationIndex % AI_SIMULATIONS.length];
        simulationIndex++;

        broadcastToCall(callId, {
          type: "ai_insight",
          data: {
            ...sim,
            riskScore: sim.distressIntensity,
            cognitiveCoherence: 1 - sim.distressIntensity * 0.5,
            agitationLevel: sim.distressIntensity * 0.7,
            confidence: 0.75 + Math.random() * 0.2,
            uncertaintyFlags: sim.distressIntensity > 0.7 ? ["contradictory_signals", "ambient_noise"] : [],
            operatorFatigueScore: Math.random() * 0.3,
            ambientSounds: sim.distressIntensity > 0.6 ? ["background_traffic", "crying"] : [],
            detectedLanguage: Math.random() > 0.7 ? "hi" : "en",
            codeSwitchCount: Math.floor(Math.random() * 3),
          },
        }, ws);
      }, 8000);
    }

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        handleMessage(callId, role, msg, ws);
      } catch {
        // ignore non-JSON binary
      }
    });

    ws.on("close", () => {
      if (aiInterval) clearInterval(aiInterval);
      const callClients = clients.get(callId) || [];
      const updated = callClients.filter(c => c.ws !== ws);
      if (updated.length === 0) {
        clients.delete(callId);
      } else {
        clients.set(callId, updated);
      }
      broadcastToCall(callId, { type: "participant_left", role });
      logger.info({ callId, role }, "WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ callId, role, err }, "WebSocket error");
    });
  });

  return wss;
}

function handleMessage(callId: string, role: string, msg: any, senderWs: WebSocket) {
  if (msg.type === "chat") {
    broadcastToCall(callId, { type: "chat", role, text: msg.text, timestamp: new Date().toISOString() }, senderWs);
  } else if (msg.type === "transcript") {
    broadcastToCall(callId, { type: "transcript", role, text: msg.text, language: msg.language, confidence: msg.confidence });
  } else if (msg.type === "operator_action") {
    broadcastToCall(callId, { type: "operator_action", action: msg.action });
  } else if (
    msg.type === "webrtc_offer" ||
    msg.type === "webrtc_answer" ||
    msg.type === "webrtc_ice_candidate"
  ) {
    // relay WebRTC signaling to the other party only
    broadcastToCall(callId, { ...msg, fromRole: role }, senderWs);
  }
}

function broadcastToCall(callId: string, msg: object, exceptWs?: WebSocket) {
  const callClients = clients.get(callId) || [];
  const payload = JSON.stringify(msg);
  for (const client of callClients) {
    if (client.ws !== exceptWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

export function getConnectedClients(callId: string) {
  return (clients.get(callId) || []).map(c => ({ role: c.role }));
}
