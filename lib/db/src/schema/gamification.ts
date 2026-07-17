import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const badgesTable = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  rarity: text("rarity").notNull().default("common"),
  criteriaType: text("criteria_type").notNull(),
  criteriaValue: integer("criteria_value").notNull().default(1),
});

export const userBadgesTable = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  badgeId: integer("badge_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  target: integer("target").notNull(),
  xpReward: integer("xp_reward").notNull().default(50),
  achievementType: text("achievement_type").notNull(),
});

export const userAchievementsTable = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  achievementId: integer("achievement_id").notNull(),
  progress: integer("progress").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
});

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpGained: integer("xp_gained").notNull().default(0),
  icon: text("icon").notNull().default("star"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const personaNotificationsTable = pgTable("persona_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  notificationType: text("notification_type").notNull(),
  message: text("message").notNull(),
  emotion: text("emotion").notNull().default("happy"),
  priority: text("priority").notNull().default("medium"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Badge = typeof badgesTable.$inferSelect;
export type Achievement = typeof achievementsTable.$inferSelect;
export type ActivityLog = typeof activityLogTable.$inferSelect;
