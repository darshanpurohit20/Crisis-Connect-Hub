import { pgTable, text, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const operatorsTable = pgTable("operators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  organization: text("organization").notNull(),
  languages: text("languages").array().notNull().default([]),
  status: text("status").notNull().default("offline"),
  activeCallId: text("active_call_id"),
  callsHandled: integer("calls_handled").notNull().default(0),
  avgCallDuration: real("avg_call_duration").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOperatorSchema = createInsertSchema(operatorsTable).omit({ createdAt: true });
export type InsertOperator = z.infer<typeof insertOperatorSchema>;
export type Operator = typeof operatorsTable.$inferSelect;
