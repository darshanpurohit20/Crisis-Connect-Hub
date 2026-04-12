import { Router } from "express";
import { db } from "@workspace/db";
import { insightsTable, callsTable, operatorsTable } from "@workspace/db";
import { eq, count, desc, inArray, not } from "drizzle-orm";

const router = Router();

function formatInsight(insight: any) {
  return {
    callId: insight.callId,
    riskLevel: insight.riskLevel,
    riskScore: insight.riskScore,
    emotionState: insight.emotionState,
    distressIntensity: insight.distressIntensity,
    cognitiveCoherence: insight.cognitiveCoherence,
    agitationLevel: insight.agitationLevel,
    suicidalIdeationFlag: insight.suicidalIdeationFlag,
    ambientSounds: insight.ambientSounds,
    detectedLanguage: insight.detectedLanguage,
    codeSwitchCount: insight.codeSwitchCount,
    recommendedAction: insight.recommendedAction,
    reasoningChain: insight.reasoningChain,
    confidence: insight.confidence,
    uncertaintyFlags: insight.uncertaintyFlags,
    operatorFatigueScore: insight.operatorFatigueScore,
    updatedAt: insight.updatedAt.toISOString(),
  };
}

router.get("/calls/:callId/insights", async (req, res) => {
  const { callId } = req.params;
  const [insight] = await db.select().from(insightsTable).where(eq(insightsTable.callId, callId)).limit(1);
  if (!insight) return res.status(404).json({ error: "not_found", message: "Insights not found" });
  return res.json(formatInsight(insight));
});

router.post("/calls/:callId/insights", async (req, res) => {
  const { callId } = req.params;
  const body = req.body;

  const [existing] = await db.select().from(insightsTable).where(eq(insightsTable.callId, callId)).limit(1);
  if (!existing) return res.status(404).json({ error: "not_found", message: "Insights record not found" });

  const updates: any = { updatedAt: new Date() };
  if (body.riskLevel !== undefined) updates.riskLevel = body.riskLevel;
  if (body.riskScore !== undefined) updates.riskScore = body.riskScore;
  if (body.emotionState !== undefined) updates.emotionState = body.emotionState;
  if (body.distressIntensity !== undefined) updates.distressIntensity = body.distressIntensity;
  if (body.recommendedAction !== undefined) updates.recommendedAction = body.recommendedAction;
  if (body.reasoningChain !== undefined) updates.reasoningChain = body.reasoningChain;
  if (body.confidence !== undefined) updates.confidence = body.confidence;

  const [updated] = await db.update(insightsTable).set(updates).where(eq(insightsTable.callId, callId)).returning();
  if (!updated) return res.status(404).json({ error: "not_found", message: "Insights not found" });

  await db.update(callsTable).set({
    riskLevel: body.riskLevel ?? existing.riskLevel,
    riskScore: body.riskScore ?? existing.riskScore,
  }).where(eq(callsTable.id, callId));

  return res.json(formatInsight(updated));
});

router.get("/insights/dashboard", async (req, res) => {
  const allInsights = await db.select().from(insightsTable);
  const allCalls = await db.select().from(callsTable);
  const allOperators = await db.select().from(operatorsTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCalls = allCalls.filter(c => c.createdAt >= today);

  const riskBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  allInsights.forEach(i => {
    const level = i.riskLevel || "low";
    riskBreakdown[level] = (riskBreakdown[level] || 0) + 1;
  });

  const langBreakdown: Record<string, number> = {};
  allCalls.forEach(c => {
    langBreakdown[c.language] = (langBreakdown[c.language] || 0) + 1;
  });

  const totalDuration = allCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
  const endedCalls = allCalls.filter(c => c.duration != null);
  const avgCallDuration = endedCalls.length > 0 ? totalDuration / endedCalls.length : 0;

  const callsPerHour: { hour: number; count: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const cnt = allCalls.filter(c => {
      const callHour = new Date(c.createdAt).getHours();
      return callHour === h;
    }).length;
    callsPerHour.push({ hour: h, count: cnt });
  }

  const actionCounts: Record<string, number> = {};
  allInsights.forEach(i => {
    if (i.recommendedAction) {
      actionCounts[i.recommendedAction] = (actionCounts[i.recommendedAction] || 0) + 1;
    }
  });
  const topRecommendedActions = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([action, count]) => ({ action, count }));

  const riskScores = allInsights.map(i => i.riskScore);
  const avgRiskScore = riskScores.length > 0 ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;
  const avgRiskLevel = avgRiskScore < 0.25 ? "low" : avgRiskScore < 0.5 ? "medium" : avgRiskScore < 0.75 ? "high" : "critical";

  const activeOperators = allOperators.filter(o => o.status !== "offline").length;

  return res.json({
    totalCallsToday: todayCalls.length,
    avgRiskLevel,
    avgCallDuration,
    languageBreakdown: langBreakdown,
    riskBreakdown,
    activeOperators,
    totalOperators: allOperators.length,
    callsPerHour,
    topRecommendedActions,
  });
});

export default router;
