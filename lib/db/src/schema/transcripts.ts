import { pgTable, text, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transcriptsTable = pgTable("transcripts", {
  id: text("id").primaryKey(),
  callId: text("call_id").notNull(),
  speaker: text("speaker").notNull(),
  text: text("text").notNull(),
  language: text("language").notNull(),
  confidence: real("confidence").notNull(),
  isCodeSwitch: boolean("is_code_switch").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertTranscriptSchema = createInsertSchema(transcriptsTable).omit({ timestamp: true });
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcriptsTable.$inferSelect;
