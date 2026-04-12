import { pgTable, text, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const callsTable = pgTable("calls", {
  id: text("id").primaryKey(),
  callerId: text("caller_id").notNull(),
  callerName: text("caller_name").notNull(),
  operatorId: text("operator_id"),
  operatorName: text("operator_name"),
  state: text("state").notNull().default("waiting"),
  language: text("language").notNull().default("en"),
  riskLevel: text("risk_level"),
  riskScore: real("risk_score"),
  duration: integer("duration"),
  location: text("location"),
  aiDisclosed: boolean("ai_disclosed").notNull().default(false),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCallSchema = createInsertSchema(callsTable).omit({ createdAt: true });
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof callsTable.$inferSelect;
