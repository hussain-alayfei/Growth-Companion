import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().default("Explorer"),
  avatarUrl: text("avatar_url"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  personaName: text("persona_name").notNull().default("Lumi"),
  personaMood: text("persona_mood").notNull().default("happy"),
  selectedCoachId: text("selected_coach_id").notNull().default("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
