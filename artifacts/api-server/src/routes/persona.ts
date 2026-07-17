import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, personaNotificationsTable, ordersTable } from "@workspace/db";
import {
  GetPersonaMessageQueryParams,
  GetPersonaMessageResponse,
  GetPersonaNotificationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type PersonaEmotion = "happy" | "excited" | "proud" | "thoughtful" | "encouraging" | "celebrating" | "warning";
type PersonaAnimation = "bounce" | "wave" | "dance" | "thumbsup" | "sparkle" | "thinking";

const MESSAGES: Record<string, { message: string; emotion: PersonaEmotion; animation: PersonaAnimation; tip?: string }[]> = {
  morning: [
    { message: "صباح الخير! الأسواق المحاكاة جاهزة — ابدأ بدرس أو صفقة صغيرة.", emotion: "happy", animation: "wave", tip: "راجع محفظتك قبل أي قرار." },
    { message: "لومي متحمسة لجلسة تعلم اليوم. اجعله يوماً منضبطاً!", emotion: "excited", animation: "bounce", tip: "اسأل مدربك عن أي سهم قبل الشراء." },
    { message: "كل يوم عظيم يبدأ بخطوة واعية. هيا نتداول ونتعلم!", emotion: "encouraging", animation: "thumbsup" },
  ],
  completion: [
    { message: "أحسنت! قرار تداول مسجّل. راجع المنطق مع مدربك.", emotion: "celebrating", animation: "dance" },
    { message: "انظر إليك تتقدم! المهارة تُبنى صفقة صفقة.", emotion: "excited", animation: "sparkle" },
    { message: "رائع! كل صفقة محاكاة لبنة في خبرتك.", emotion: "proud", animation: "thumbsup" },
  ],
  streak: [
    { message: "سلسلتك في التداول تتوهج! الاستمرارية قوتك السرية.", emotion: "proud", animation: "sparkle", tip: "الانتظام أهم من حجم الصفقة." },
    { message: "يوم بعد يوم تحضر — هكذا يُصنع المتداول المنضبط!", emotion: "excited", animation: "bounce" },
  ],
  trading: [
    { message: "الأسواق المحاكاة مفتوحة. لومي تراقب المخططات معك!", emotion: "excited", animation: "bounce", tip: "احمِ رأس المال أولاً، ثم فكّر بالعائد." },
    { message: "كل صفقة درس — سواء ربحت أو خسرت. استمر في التعلم!", emotion: "thoughtful", animation: "thinking", tip: "اطلب مراجعة الجلسة في نهاية اليوم." },
    { message: "الصبر في التداول قوة خارقة. أفضل الفرص تستحق الانتظار.", emotion: "encouraging", animation: "wave" },
  ],
  idle: [
    { message: "مرحباً! محفظتك ومحاكي السوق ينتظرانك.", emotion: "encouraging", animation: "wave" },
    { message: "دفعة لطيفة: جرب سؤالاً لمدربك أو صفقة تعليمية صغيرة.", emotion: "happy", animation: "bounce" },
  ],
};

// GET /persona/message
router.get("/persona/message", async (req, res): Promise<void> => {
  const parsed = GetPersonaMessageQueryParams.safeParse(req.query);
  const context = (parsed.success ? parsed.data.context : "morning") ?? "morning";

  const pool = MESSAGES[context] ?? MESSAGES.morning;
  const msg = pool[Math.floor(Math.random() * pool.length)];

  res.json(GetPersonaMessageResponse.parse({
    message: msg.message,
    emotion: msg.emotion,
    animation: msg.animation,
    tip: msg.tip ?? null,
  }));
});

// GET /persona/notifications
router.get("/persona/notifications", async (_req, res): Promise<void> => {
  const userId = 1;
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, userId));
  const today = new Date().toISOString().split("T")[0];
  const hasTradedToday = orders.some((o) => o.executedAt.toISOString().split("T")[0] === today);

  const stored = await db
    .select()
    .from(personaNotificationsTable)
    .where(eq(personaNotificationsTable.userId, userId))
    .orderBy(desc(personaNotificationsTable.createdAt))
    .limit(10);

  const dynamicNotifs = [];
  if (!hasTradedToday && stored.length === 0) {
    dynamicNotifs.push({
      id: 0,
      type: "encouragement",
      message: "لم تتداول اليوم بعد. حتى صفقة محاكاة صغيرة تبني المهارة!",
      emotion: "encouraging" as const,
      priority: "medium" as const,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  const result = [
    ...dynamicNotifs,
    ...stored.map((n) => ({
      id: n.id,
      type: n.notificationType,
      message: n.message,
      emotion: n.emotion as PersonaEmotion,
      priority: n.priority as "low" | "medium" | "high",
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  ];

  res.json(GetPersonaNotificationsResponse.parse(result));
});

export default router;
