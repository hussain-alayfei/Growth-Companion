import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import { db, usersTable, activityLogTable } from "@workspace/db";

const router: IRouter = Router();

const XP_PER_CORRECT = 10;
const DAILY_QUESTION_LIMIT = 5;

const QUIZ_BANK = [
  {
    id: "q1",
    question: "ما الذي يحدث عادة عندما يرتفع الطلب على سهم معيّن؟",
    options: ["ينخفض السعر", "يرتفع السعر", "يتوقف التداول", "تُلغى الشركة"],
    correctIndex: 1,
    explanation: "ارتفاع الطلب مع ثبات العرض يدفع السعر للأعلى.",
  },
  {
    id: "q2",
    question: "ما معنى التنويع في المحفظة؟",
    options: [
      "شراء سهم واحد فقط",
      "توزيع الاستثمار على أصول مختلفة لتقليل المخاطر",
      "بيع كل الأسهم يومياً",
      "الاقتراض لزيادة الشراء",
    ],
    correctIndex: 1,
    explanation: "التنويع يقلل أثر خسارة أصل واحد على المحفظة كلها.",
  },
  {
    id: "q3",
    question: "أي عبارة تصف الاستثمار طويل الأجل بشكل أفضل؟",
    options: [
      "البحث عن أرباح خلال دقائق",
      "الاحتفاظ بأصول جيدة لسنوات",
      "تجاهل الأساسيات تماماً",
      "التداول فقط أثناء الأخبار السيئة",
    ],
    correctIndex: 1,
    explanation: "الاستثمار طويل الأجل يعتمد على نمو الشركات مع الوقت.",
  },
  {
    id: "q4",
    question: "ما هو وقف الخسارة (Stop Loss)؟",
    options: [
      "أمر لشراء المزيد تلقائياً",
      "أمر لبيع الأصل عند وصوله لسعر محدد لتقليل الخسارة",
      "ضريبة على الأرباح",
      "مؤشر فني للاتجاه الصاعد",
    ],
    correctIndex: 1,
    explanation: "وقف الخسارة أداة لإدارة المخاطر وتحديد أقصى خسارة مقبولة.",
  },
  {
    id: "q5",
    question: "ما الفرق الأساسي بين السهم والسند؟",
    options: [
      "السهم دين والسند ملكية",
      "السهم ملكية في الشركة والسند أداة دين",
      "لا يوجد فرق",
      "السند دائماً أعلى عائداً",
    ],
    correctIndex: 1,
    explanation: "حامل السهم شريك ملكية، وحامل السند مقرض يحصل على فائدة.",
  },
  {
    id: "q6",
    question: "ماذا يعني P/E (مكرر الربحية) تقريباً؟",
    options: [
      "عدد موظفي الشركة",
      "سعر السهم مقسوماً على ربحية السهم",
      "حجم التداول اليومي",
      "نسبة الديون فقط",
    ],
    correctIndex: 1,
    explanation: "P/E يساعد في مقارنة تقييم الشركة بالنسبة لأرباحها.",
  },
  {
    id: "q7",
    question: "أي سلوك يُعد من أخطاء المبتدئين الشائعة؟",
    options: [
      "البحث قبل الشراء",
      "متابعة خطة واضحة",
      "الاندفاع خلف الشائعات بدون تحليل",
      "تحديد حجم صفقة مناسب",
    ],
    correctIndex: 2,
    explanation: "اتباع الشائعات بدون بحث يزيد احتمالية الخسارة.",
  },
  {
    id: "q8",
    question: "ما الهدف من المحفظة التجريبية (Paper Trading)؟",
    options: [
      "ربح نقدي فوري",
      "التعلم والتجربة دون مخاطرة بأموال حقيقية",
      "تجاوز القوانين",
      "زيادة الضرائب",
    ],
    correctIndex: 1,
    explanation: "المحاكاة تمنحك خبرة عملية بأمان قبل التداول الحقيقي.",
  },
];

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function pickDailyQuestions(seed: string, count: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const shuffled = [...QUIZ_BANK];
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const j = hash % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

async function getOrCreateUser(userId: number) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    [user] = await db.insert(usersTable).values({ id: userId }).returning();
  }
  return user;
}

async function getTodayQuizAnswers(userId: number) {
  const dayStart = startOfUtcDay();
  return db
    .select()
    .from(activityLogTable)
    .where(
      and(
        eq(activityLogTable.userId, userId),
        eq(activityLogTable.activityType, "quiz_answer"),
        gte(activityLogTable.createdAt, dayStart),
      ),
    )
    .orderBy(desc(activityLogTable.createdAt));
}

// GET /education/quiz/today
router.get("/education/quiz/today", async (_req, res): Promise<void> => {
  const userId = 1;
  await getOrCreateUser(userId);
  const todayKey = new Date().toISOString().slice(0, 10);
  const answers = await getTodayQuizAnswers(userId);
  const answeredIds = new Set(
    answers
      .map((a) => {
        const match = a.description.match(/\[([^\]]+)\]/);
        return match?.[1];
      })
      .filter(Boolean) as string[],
  );

  const questions = pickDailyQuestions(todayKey, DAILY_QUESTION_LIMIT).map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    answered: answeredIds.has(q.id),
  }));

  const xpEarnedToday = answers.reduce((s, a) => s + (a.xpGained || 0), 0);
  const remaining = questions.filter((q) => !q.answered).length;

  res.json({
    date: todayKey,
    xpPerCorrect: XP_PER_CORRECT,
    xpEarnedToday,
    remaining,
    total: DAILY_QUESTION_LIMIT,
    questions,
  });
});

// POST /education/quiz/answer
router.post("/education/quiz/answer", async (req, res): Promise<void> => {
  const userId = 1;
  const { questionId, selectedIndex } = req.body ?? {};

  if (typeof questionId !== "string" || typeof selectedIndex !== "number") {
    res.status(400).json({ error: "questionId and selectedIndex required" });
    return;
  }

  const question = QUIZ_BANK.find((q) => q.id === questionId);
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const dailyIds = new Set(pickDailyQuestions(todayKey, DAILY_QUESTION_LIMIT).map((q) => q.id));
  if (!dailyIds.has(questionId)) {
    res.status(400).json({ error: "Question is not part of today's quiz" });
    return;
  }

  const answers = await getTodayQuizAnswers(userId);
  const already = answers.some((a) => a.description.includes(`[${questionId}]`));
  if (already) {
    res.status(409).json({ error: "Already answered today", alreadyAnswered: true });
    return;
  }

  if (answers.length >= DAILY_QUESTION_LIMIT) {
    res.status(400).json({ error: "Daily quiz limit reached" });
    return;
  }

  const correct = selectedIndex === question.correctIndex;
  const xpGained = correct ? XP_PER_CORRECT : 0;

  await db.insert(activityLogTable).values({
    userId,
    activityType: "quiz_answer",
    title: correct ? "أجاب سؤالاً تعليمياً صح" : "حاول سؤالاً تعليمياً",
    description: `[${questionId}] ${question.question.slice(0, 60)}`,
    xpGained,
    icon: "graduation-cap",
  });

  if (xpGained > 0) {
    const user = await getOrCreateUser(userId);
    await db
      .update(usersTable)
      .set({ xp: (user.xp ?? 0) + xpGained })
      .where(eq(usersTable.id, userId));
  }

  const updatedAnswers = await getTodayQuizAnswers(userId);
  const remaining = Math.max(0, DAILY_QUESTION_LIMIT - updatedAnswers.length);

  res.json({
    correct,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    xpGained,
    remaining,
    xpEarnedToday: updatedAnswers.reduce((s, a) => s + (a.xpGained || 0), 0),
  });
});

export default router;
