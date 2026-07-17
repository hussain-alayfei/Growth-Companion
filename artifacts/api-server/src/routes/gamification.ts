import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, badgesTable, userBadgesTable, achievementsTable, userAchievementsTable, ordersTable } from "@workspace/db";
import {
  GetUserProfileResponse,
  GetBadgesResponse,
  GetAchievementsResponse,
  GetStreakResponse,
  GetLeaderboardResponse,
  UpdateSelectedCoachBody,
  UpdateSelectedCoachResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const XP_PER_LEVEL = 500;
const VALID_COACHES = ["value", "growth", "risk", "technical"] as const;

function xpToNextLevel(currentXp: number): number {
  const level = Math.floor(currentXp / XP_PER_LEVEL) + 1;
  return level * XP_PER_LEVEL - currentXp;
}

function getLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

async function getOrCreateUser(userId: number) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    [user] = await db.insert(usersTable).values({ id: userId }).returning();
  }
  return user;
}

async function getTradeDateSet(userId: number): Promise<Set<string>> {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(desc(ordersTable.executedAt));
  return new Set(orders.map((o) => o.executedAt.toISOString().split("T")[0]));
}

async function getCurrentStreak(userId: number): Promise<number> {
  const dateSet = await getTradeDateSet(userId);
  if (dateSet.size === 0) return 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const checkDate = new Date();
  if (!dateSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const ds = checkDate.toISOString().split("T")[0];
    if (!dateSet.has(ds)) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

function longestStreakFromDates(dateSet: string[]): number {
  const sorted = [...dateSet].sort();
  let longest = 0;
  let temp = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      temp = 1;
    } else {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      temp = diff === 1 ? temp + 1 : 1;
    }
    longest = Math.max(longest, temp);
  }
  return longest;
}

// GET /gamification/profile
router.get("/gamification/profile", async (_req, res): Promise<void> => {
  const user = await getOrCreateUser(1);
  const currentStreak = await getCurrentStreak(1);
  const dateSet = [...(await getTradeDateSet(1))];
  const longest = longestStreakFromDates(dateSet);
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, 1));

  const xp = user.xp;
  res.json(GetUserProfileResponse.parse({
    username: user.username,
    avatarUrl: user.avatarUrl ?? null,
    level: getLevel(xp),
    xp,
    xpToNextLevel: xpToNextLevel(xp),
    currentStreak,
    longestStreak: Math.max(longest, currentStreak),
    totalTrades: orders.length,
    selectedCoachId: user.selectedCoachId ?? "value",
    personaName: user.personaName,
    personaMood: user.personaMood as "happy" | "excited" | "proud" | "sleepy" | "encouraging",
    joinedAt: user.createdAt.toISOString(),
  }));
});

// PATCH /gamification/coach
router.patch("/gamification/coach", async (req, res): Promise<void> => {
  const parsed = UpdateSelectedCoachBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { coachId } = parsed.data;
  if (!VALID_COACHES.includes(coachId as typeof VALID_COACHES[number])) {
    res.status(400).json({ error: "Invalid coachId" });
    return;
  }
  const user = await getOrCreateUser(1);
  const [updated] = await db
    .update(usersTable)
    .set({ selectedCoachId: coachId })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(UpdateSelectedCoachResponse.parse({
    selectedCoachId: updated.selectedCoachId,
  }));
});

// GET /gamification/badges
router.get("/gamification/badges", async (_req, res): Promise<void> => {
  const badges = await db.select().from(badgesTable).orderBy(badgesTable.id);
  const userBadges = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, 1));
  const earnedIds = new Set(userBadges.map((b) => b.badgeId));

  const result = badges.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    category: b.category,
    earned: earnedIds.has(b.id),
    earnedAt: userBadges.find((ub) => ub.badgeId === b.id)?.earnedAt.toISOString() ?? null,
    rarity: b.rarity,
  }));

  res.json(GetBadgesResponse.parse(result));
});

// GET /gamification/achievements
router.get("/gamification/achievements", async (_req, res): Promise<void> => {
  const achievements = await db.select().from(achievementsTable).orderBy(achievementsTable.id);
  const userAchievements = await db.select().from(userAchievementsTable).where(eq(userAchievementsTable.userId, 1));
  const tradeCount = (await db.select().from(ordersTable).where(eq(ordersTable.userId, 1))).length;
  const streak = await getCurrentStreak(1);

  const result = achievements.map((a) => {
    const ua = userAchievements.find((u) => u.achievementId === a.id);
    let progress = ua?.progress ?? 0;

    if (a.achievementType === "task_count" || a.achievementType === "trade_count") {
      progress = Math.min(tradeCount, a.target);
    } else if (a.achievementType === "streak") {
      progress = Math.min(streak, a.target);
    }

    const completed = progress >= a.target;
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      icon: a.icon,
      progress,
      target: a.target,
      completed,
      completedAt: ua?.completed && ua?.completedAt ? ua.completedAt.toISOString() : null,
      xpReward: a.xpReward,
    };
  });

  res.json(GetAchievementsResponse.parse(result));
});

// GET /gamification/streak
router.get("/gamification/streak", async (_req, res): Promise<void> => {
  const currentStreak = await getCurrentStreak(1);
  const dateSet = [...(await getTradeDateSet(1))].sort();
  const longest = longestStreakFromDates(dateSet);

  const now = new Date();
  const heatmap = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const inSet = dateSet.includes(ds);
    heatmap.push({
      date: ds,
      completed: inSet ? 1 : 0,
      total: 1,
      intensity: inSet ? 1.0 : 0,
    });
  }

  const lastActiveDate = dateSet.length > 0 ? dateSet[dateSet.length - 1] : new Date().toISOString().split("T")[0];

  res.json(GetStreakResponse.parse({
    currentStreak,
    longestStreak: Math.max(longest, currentStreak),
    lastActiveDate,
    weeklyHeatmap: heatmap,
  }));
});

// GET /gamification/leaderboard
router.get("/gamification/leaderboard", async (_req, res): Promise<void> => {
  const user = await getOrCreateUser(1);
  const streak = await getCurrentStreak(1);

  const simulatedUsers = [
    { rank: 1, username: "ZenMaster", streak: streak + 12, xp: user.xp + 3200, level: getLevel(user.xp + 3200), isCurrentUser: false, avatarUrl: null },
    { rank: 2, username: "FocusFlow", streak: streak + 7, xp: user.xp + 1800, level: getLevel(user.xp + 1800), isCurrentUser: false, avatarUrl: null },
    { rank: 3, username: "GrowthMind", streak: streak + 3, xp: user.xp + 800, level: getLevel(user.xp + 800), isCurrentUser: false, avatarUrl: null },
    { rank: 4, username: user.username, streak, xp: user.xp, level: getLevel(user.xp), isCurrentUser: true, avatarUrl: user.avatarUrl ?? null },
    { rank: 5, username: "DailyWin", streak: Math.max(0, streak - 2), xp: Math.max(0, user.xp - 300), level: getLevel(Math.max(0, user.xp - 300)), isCurrentUser: false, avatarUrl: null },
    { rank: 6, username: "PeakSelf", streak: Math.max(0, streak - 5), xp: Math.max(0, user.xp - 700), level: getLevel(Math.max(0, user.xp - 700)), isCurrentUser: false, avatarUrl: null },
  ];

  res.json(GetLeaderboardResponse.parse(simulatedUsers));
});

export default router;
