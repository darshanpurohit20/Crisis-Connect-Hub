import { pgTable, text, timestamp, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const insightsTable = pgTable("insights", {
  id: text("id").primaryKey(),
  callId: text("call_id").notNull().unique(),
  riskLevel: text("risk_level").notNull().default("low"),
  riskScore: real("risk_score").notNull().default(0),
  emotionState: text("emotion_state").notNull().default("neutral"),
  distressIntensity: real("distress_intensity").notNull().default(0),
  cognitiveCoherence: real("cognitive_coherence").notNull().default(1),
  agitationLevel: real("agitation_level").notNull().default(0),
  suicidalIdeationFlag: boolean("suicidal_ideation_flag").notNull().default(false),
  ambientSounds: text("ambient_sounds").array().notNull().default([]),
  detectedLanguage: text("detected_language").notNull().default("en"),
  codeSwitchCount: integer("code_switch_count").notNull().default(0),
  recommendedAction: text("recommended_action").notNull().default(""),
  reasoningChain: text("reasoning_chain").notNull().default(""),
  confidence: real("confidence").notNull().default(0),
  uncertaintyFlags: text("uncertainty_flags").array().notNull().default([]),
  operatorFatigueScore: real("operator_fatigue_score").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInsightSchema = createInsertSchema(insightsTable).omit({ updatedAt: true });
export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insightsTable.$inferSelect;
