import { Router } from "express";
import { db } from "@workspace/db";
import { callsTable, operatorsTable, transcriptsTable, insightsTable } from "@workspace/db";
import { eq, and, desc, not, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function formatCall(call: any) {
  return {
    id: call.id,
    callerId: call.callerId,
    callerName: call.callerName,
    operatorId: call.operatorId ?? null,
    operatorName: call.operatorName ?? null,
    state: call.state,
    language: call.language,
    riskLevel: call.riskLevel ?? null,
    riskScore: call.riskScore ?? null,
    duration: call.duration ?? null,
    startedAt: call.startedAt ? call.startedAt.toISOString() : null,
    endedAt: call.endedAt ? call.endedAt.toISOString() : null,
    createdAt: call.createdAt.toISOString(),
    location: call.location ?? null,
    aiDisclosed: call.aiDisclosed,
  };
}

router.get("/calls", async (req, res) => {
  const calls = await db.select().from(callsTable).orderBy(desc(callsTable.createdAt)).limit(50);
  return res.json(calls.map(formatCall));
});

router.post("/calls", async (req, res) => {
  const { callerId, callerName, language = "en", location } = req.body;
  if (!callerId || !callerName) {
    return res.status(400).json({ error: "bad_request", message: "callerId and callerName required" });
  }

  const id = randomUUID();
  const [call] = await db.insert(callsTable).values({
    id,
    callerId,
    callerName,
    language,
    location: location ?? null,
    state: "waiting",
    aiDisclosed: false,
  }).returning();

  await db.insert(insightsTable).values({
    id: randomUUID(),
    callId: id,
    riskLevel: "low",
    riskScore: 0.1,
    emotionState: "neutral",
    distressIntensity: 0.1,
    cognitiveCoherence: 0.9,
    agitationLevel: 0.05,
    suicidalIdeationFlag: false,
    ambientSounds: [],
    detectedLanguage: language,
    codeSwitchCount: 0,
    recommendedAction: "Listen actively and establish rapport",
    reasoningChain: "Initial assessment — caller has just connected",
    confidence: 0.5,
    uncertaintyFlags: ["insufficient_data"],
    operatorFatigueScore: 0,
  });

  return res.status(201).json(formatCall(call));
});

router.get("/calls/:callId", async (req, res) => {
  const { callId } = req.params;
  const [call] = await db.select().from(callsTable).where(eq(callsTable.id, callId)).limit(1);
  if (!call) return res.status(404).json({ error: "not_found", message: "Call not found" });
  return res.json(formatCall(call));
});

router.patch("/calls/:callId/state", async (req, res) => {
  const { callId } = req.params;
  const { state, operatorId } = req.body;

  if (!state) {
    return res.status(400).json({ error: "bad_request", message: "state required" });
  }

  const updates: any = { state };
  if (state === "active" && !updates.startedAt) {
    updates.startedAt = new Date();
  }
  if (state === "ended") {
    updates.endedAt = new Date();
    const [call] = await db.select().from(callsTable).where(eq(callsTable.id, callId)).limit(1);
    if (call?.startedAt) {
      updates.duration = Math.floor((Date.now() - call.startedAt.getTime()) / 1000);
    }
    if (call?.operatorId) {
      const [op] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, call.operatorId)).limit(1);
      if (op) {
        const newCount = op.callsHandled + 1;
        const newAvg = op.avgCallDuration === 0
          ? (updates.duration ?? 0)
          : (op.avgCallDuration * op.callsHandled + (updates.duration ?? 0)) / newCount;
        await db.update(operatorsTable).set({
          status: "available",
          activeCallId: null,
          callsHandled: newCount,
          avgCallDuration: newAvg,
        }).where(eq(operatorsTable.id, call.operatorId));
      }
    }
  }

  const [updated] = await db.update(callsTable).set(updates).where(eq(callsTable.id, callId)).returning();
  if (!updated) return res.status(404).json({ error: "not_found", message: "Call not found" });
  return res.json(formatCall(updated));
});

router.post("/calls/:callId/assign", async (req, res) => {
  const { callId } = req.params;
  const { operatorId } = req.body;

  if (!operatorId) {
    return res.status(400).json({ error: "bad_request", message: "operatorId required" });
  }

  const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, operatorId)).limit(1);
  if (!operator) return res.status(404).json({ error: "not_found", message: "Operator not found" });

  const [call] = await db.update(callsTable).set({
    operatorId,
    operatorName: operator.name,
    state: "active",
    startedAt: new Date(),
  }).where(eq(callsTable.id, callId)).returning();

  if (!call) return res.status(404).json({ error: "not_found", message: "Call not found" });

  await db.update(operatorsTable).set({ status: "busy", activeCallId: callId }).where(eq(operatorsTable.id, operatorId));

  return res.json(formatCall(call));
});

router.get("/calls/:callId/transcript", async (req, res) => {
  const { callId } = req.params;
  const segments = await db.select().from(transcriptsTable)
    .where(eq(transcriptsTable.callId, callId))
    .orderBy(transcriptsTable.timestamp);

  return res.json(segments.map(s => ({
    id: s.id,
    callId: s.callId,
    speaker: s.speaker,
    text: s.text,
    language: s.language,
    confidence: s.confidence,
    timestamp: s.timestamp.toISOString(),
    isCodeSwitch: s.isCodeSwitch,
  })));
});

router.post("/calls/:callId/transcript", async (req, res) => {
  const { callId } = req.params;
  const { speaker, text, language, confidence, isCodeSwitch } = req.body;

  const id = randomUUID();
  const [segment] = await db.insert(transcriptsTable).values({
    id,
    callId,
    speaker,
    text,
    language,
    confidence,
    isCodeSwitch: isCodeSwitch ?? false,
  }).returning();

  return res.status(201).json({
    id: segment.id,
    callId: segment.callId,
    speaker: segment.speaker,
    text: segment.text,
    language: segment.language,
    confidence: segment.confidence,
    timestamp: segment.timestamp.toISOString(),
    isCodeSwitch: segment.isCodeSwitch,
  });
});

router.get("/calls/:callId/resources", async (req, res) => {
  const resources = [
    { id: randomUUID(), name: "AIIMS Delhi Emergency", type: "hospital", address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi", phone: "011-26588500", distance: 1.2, isOpen24h: true, lat: 28.5672, lng: 77.2100 },
    { id: randomUUID(), name: "Ram Manohar Lohia Hospital", type: "hospital", address: "Baba Kharak Singh Marg, New Delhi", phone: "011-23404000", distance: 2.5, isOpen24h: true, lat: 28.6344, lng: 77.2016 },
    { id: randomUUID(), name: "iCall Mental Health", type: "counseling", address: "TISS Mumbai Campus, V.N. Purav Marg, Deonar", phone: "9152987821", distance: 3.1, isOpen24h: false, lat: 19.0348, lng: 72.9120 },
    { id: randomUUID(), name: "Vandrevala Foundation Helpline", type: "counseling", address: "Nationwide Helpline Service", phone: "1860-2662-345", distance: 0, isOpen24h: true, lat: 28.6139, lng: 77.2090 },
    { id: randomUUID(), name: "Connaught Place Police Station", type: "police", address: "Baba Kharak Singh Marg, Connaught Place, New Delhi", phone: "011-23736396", distance: 2.8, isOpen24h: true, lat: 28.6329, lng: 77.2195 },
    { id: randomUUID(), name: "Apollo Pharmacy", type: "pharmacy", address: "Connaught Place, New Delhi", phone: "1800-180-0104", distance: 0.9, isOpen24h: true, lat: 28.6315, lng: 77.2167 },
  ];

  return res.json(resources);
});

export default router;
