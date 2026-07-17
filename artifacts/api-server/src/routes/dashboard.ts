import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, ordersTable, activityLogTable, portfoliosTable, holdingsTable, stocksTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
  GetBehavioralInsightsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getLevel(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

function xpToNextLevel(xp: number): number {
  return (Math.floor(xp / 500) + 1) * 500 - xp;
}

async function getTradeDates(userId: number): Promise<string[]> {
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId));
  return [...new Set(orders.map((o) => o.executedAt.toISOString().split("T")[0]))].sort();
}

function calcStreak(dateSet: Set<string>): number {
  const today = todayStr();
  const checkDate = new Date();
  if (!dateSet.has(today)) checkDate.setDate(checkDate.getDate() - 1);
  let streak = 0;
  while (true) {
    const ds = checkDate.toISOString().split("T")[0];
    if (!dateSet.has(ds)) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

async function buildPortfolioSnapshot(userId: number) {
  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.userId, userId));
  if (!portfolio) {
    return { totalValue: 10000, dayChange: 0, dayChangePercent: 0 };
  }
  const holdings = await db.select().from(holdingsTable).where(eq(holdingsTable.userId, userId));
  let holdingsValue = 0;
  for (const h of holdings) {
    const [stock] = await db.select().from(stocksTable).where(eq(stocksTable.symbol, h.symbol));
    const price = stock ? parseFloat(stock.currentPrice) : parseFloat(h.avgCost);
    holdingsValue += parseFloat(h.shares) * price;
  }
  const cash = parseFloat(portfolio.cashBalance);
  const totalValue = holdingsValue + cash;
  const invested = holdings.reduce((s, h) => s + parseFloat(h.shares) * parseFloat(h.avgCost), 0);
  const dayChange = holdingsValue - invested;
  const dayChangePercent = invested > 0 ? (dayChange / invested) * 100 : 0;
  return { totalValue, dayChange, dayChangePercent };
}

// GET /dashboard/summary
router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const userId = 1;

  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    [user] = await db.insert(usersTable).values({}).returning();
  }

  const tradeDates = await getTradeDates(userId);
  const dateSet = new Set(tradeDates);
  const streak = calcStreak(dateSet);
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId));
  const today = todayStr();
  const tradesToday = orders.filter((o) => o.executedAt.toISOString().split("T")[0] === today).length;
  const portfolioSnapshot = await buildPortfolioSnapshot(userId);

  const messages = [
    "مرحباً! جاهز لجلسة تداول تعليمية اليوم؟",
    "الاستمرارية تبني مهارة السوق. واصل التعلم!",
    `نفّذت ${tradesToday} صفقة اليوم — راجع قراراتك مع مدربك.`,
    "كل صفقة محاكاة درس آمن. ركّز على العملية لا النتيجة.",
    "لومي هنا لمساعدتك على التفكير كمستثمر منضبط.",
  ];
  const personaMessage = messages[new Date().getHours() % messages.length];

  const xp = user.xp;
  res.json(GetDashboardSummaryResponse.parse({
    tradeStats: {
      tradesToday,
      totalTrades: orders.length,
      streakDays: streak,
    },
    streak,
    portfolioSnapshot,
    personaMessage,
    selectedCoachId: user.selectedCoachId ?? "value",
    upcomingMilestone: streak >= 3 ? `${7 - streak} أيام تداول متبقية لوسام 7 أيام!` : null,
    level: getLevel(xp),
    xp,
    xpToNextLevel: xpToNextLevel(xp),
  }));
});

// GET /dashboard/activity
router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const queryParsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 10) : 10;

  const activities = await db
    .select()
    .from(activityLogTable)
    .where(eq(activityLogTable.userId, 1))
    .orderBy(desc(activityLogTable.createdAt))
    .limit(limit);

  const result = activities.map((a) => ({
    id: a.id,
    type: a.activityType,
    title: a.title,
    description: a.description,
    xpGained: a.xpGained,
    timestamp: a.createdAt.toISOString(),
    icon: a.icon,
  }));

  res.json(GetRecentActivityResponse.parse(result));
});

// GET /dashboard/insights
router.get("/dashboard/insights", async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, 1));
  const buyCount = orders.filter((o) => o.orderType === "buy").length;
  const sellCount = orders.filter((o) => o.orderType === "sell").length;

  const dayCounts: Record<number, number> = {};
  for (const o of orders) {
    const day = o.executedAt.getDay();
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const bestDayOfWeek = bestDay ? dayNames[parseInt(bestDay[0])] : null;

  const tradeDates = await getTradeDates(1);
  const consistencyScore = Math.min(100, Math.round((tradeDates.length / 7) * 100));

  res.json(GetBehavioralInsightsResponse.parse({
    strongestCategory: buyCount >= sellCount ? "شراء" : "بيع",
    weakestCategory: buyCount >= sellCount ? (sellCount === 0 ? null : "بيع") : "شراء",
    bestDayOfWeek,
    peakHour: 10,
    consistencyScore,
    trends: [
      "قراراتك في التداول المحاكى تتحسن مع الممارسة المنتظمة.",
      "راجع محفظتك قبل كل جلسة مع مدربك الذكي.",
      "نشاطك في التداول يبلغ ذروته في منتصف الأسبوع.",
    ],
    suggestions: [
      "حدد حجم مركز قبل الدخول — لا بعد ارتفاع السعر.",
      "اطلب مراجعة الجلسة بعد كل يوم تداول.",
      "فكر في تخصيص مراجعة أسبوعية للمحفظة كل أحد.",
    ],
  }));
});

export default router;
