import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestSessionsTable = pgTable("guest_sessions", {
  sessionId: text("session_id").primaryKey(),
  callerId: text("caller_id").notNull(),
  name: text("name").notNull(),
  language: text("language").notNull().default("en"),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGuestSessionSchema = createInsertSchema(guestSessionsTable).omit({ createdAt: true });
export type InsertGuestSession = z.infer<typeof insertGuestSessionSchema>;
export type GuestSession = typeof guestSessionsTable.$inferSelect;
