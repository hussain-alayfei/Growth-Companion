import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, usersTable, activityLogTable } from "@workspace/db";

const router: IRouter = Router();

const XP_PER_CORRECT = 10;
const ACTIVITY_TYPE = "level_answer";

type QuizQ = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const QUESTIONS: Record<string, QuizQ> = {
  // ── Level 1: أساسيات السوق ──────────────────────────────────────────
  l1q1: {
    id: "l1q1",
    question: "ما الذي يحدث عادة عندما يرتفع الطلب على سهم معيّن؟",
    options: ["ينخفض السعر", "يرتفع السعر", "يتوقف التداول", "تُلغى الشركة"],
    correctIndex: 1,
    explanation: "ارتفاع الطلب مع ثبات العرض يدفع السعر للأعلى.",
  },
  l1q2: {
    id: "l1q2",
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
  l1q3: {
    id: "l1q3",
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

  // ── Level 2: فهم الصفقات ────────────────────────────────────────────
  l2q1: {
    id: "l2q1",
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
  l2q2: {
    id: "l2q2",
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
  l2q3: {
    id: "l2q3",
    question: "ماذا يعني أن السهم 'صاعد' (Bullish)؟",
    options: [
      "المتداولون يتوقعون انخفاض السعر",
      "المتداولون يتوقعون ارتفاع السعر",
      "السهم متوقف عن التداول",
      "الشركة أفلست",
    ],
    correctIndex: 1,
    explanation: "الاتجاه الصاعد (Bull) يعني تفاؤل وتوقع ارتفاع الأسعار.",
  },

  // ── Level 3: إدارة المخاطر ──────────────────────────────────────────
  l3q1: {
    id: "l3q1",
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
  l3q2: {
    id: "l3q2",
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
  l3q3: {
    id: "l3q3",
    question: "ماذا يعني حجم الصفقة (Position Size)؟",
    options: [
      "عدد الشركات في السوق",
      "كمية رأس المال المخصصة لصفقة واحدة",
      "سعر السهم فقط",
      "عدد أيام الاحتفاظ",
    ],
    correctIndex: 1,
    explanation: "تحديد حجم الصفقة يحميك من خسارة كبيرة إذا سارت الصفقة ضدك.",
  },

  // ── Level 4: تحليل وتقييم ───────────────────────────────────────────
  l4q1: {
    id: "l4q1",
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
  l4q2: {
    id: "l4q2",
    question: "ما المقصود بالسيولة في السوق؟",
    options: [
      "كمية الماء في الشركة",
      "سهولة شراء أو بيع الأصل بسرعة بسعر عادل",
      "عدد الموظفين",
      "ضريبة المبيعات",
    ],
    correctIndex: 1,
    explanation: "السوق السائل يعني يمكنك الدخول والخروج من الصفقة بسهولة.",
  },
  l4q3: {
    id: "l4q3",
    question: "ما هو توزيع الأرباح (Dividend)؟",
    options: [
      "غرامة على المساهمين",
      "جزء من أرباح الشركة يُوزَّع على المساهمين",
      "ضريبة حكومية",
      "رسوم وساطة",
    ],
    correctIndex: 1,
    explanation: "بعض الشركات توزع جزءاً من أرباحها نقداً أو أسهماً على المساهمين.",
  },
};

type LevelDef = {
  id: string;
  title: string;
  subtitle: string;
  kind: "lesson" | "story" | "listen" | "practice" | "chest";
  offset: number;
  questionIds: string[];
  /** previous level id that must be completed (null = always unlockable if not chest) */
  requires: string | null;
  isChest?: boolean;
};

const LEVELS: LevelDef[] = [
  {
    id: "lvl1",
    title: "أساسيات السوق",
    subtitle: "٣ أسئلة · عرض وطلب",
    kind: "lesson",
    offset: 0,
    questionIds: ["l1q1", "l1q2", "l1q3"],
    requires: null,
  },
  {
    id: "lvl2",
    title: "فهم الصفقات",
    subtitle: "٣ أسئلة · أسهم وسندات",
    kind: "story",
    offset: 28,
    questionIds: ["l2q1", "l2q2", "l2q3"],
    requires: "lvl1",
  },
  {
    id: "chest1",
    title: "كنز النقاط",
    subtitle: "مكافأة بعد المستوى ٢",
    kind: "chest",
    offset: -8,
    questionIds: [],
    requires: "lvl2",
    isChest: true,
  },
  {
    id: "lvl3",
    title: "إدارة المخاطر",
    subtitle: "٣ أسئلة · وقف خسارة",
    kind: "listen",
    offset: -30,
    questionIds: ["l3q1", "l3q2", "l3q3"],
    requires: "lvl2",
  },
  {
    id: "lvl4",
    title: "تحليل وتقييم",
    subtitle: "٣ أسئلة · P/E وسيولة",
    kind: "practice",
    offset: 18,
    questionIds: ["l4q1", "l4q2", "l4q3"],
    requires: "lvl3",
  },
  {
    id: "lvl5",
    title: "قريباً",
    subtitle: "مستوى متقدم",
    kind: "lesson",
    offset: 0,
    questionIds: [],
    requires: "lvl4",
  },
];

function tag(levelId: string, questionId: string) {
  return `[${levelId}:${questionId}]`;
}

async function getOrCreateUser(userId: number) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    [user] = await db.insert(usersTable).values({ id: userId }).returning();
  }
  return user;
}

async function getLevelAnswers(userId: number, levelId?: string) {
  const rows = await db
    .select()
    .from(activityLogTable)
    .where(and(eq(activityLogTable.userId, userId), eq(activityLogTable.activityType, ACTIVITY_TYPE)))
    .orderBy(desc(activityLogTable.createdAt));

  if (!levelId) return rows;
  return rows.filter((r) => r.description.includes(`[${levelId}:`));
}

function answeredQuestionIds(rows: { description: string }[], levelId: string): Set<string> {
  const set = new Set<string>();
  const re = new RegExp(`\\[${levelId}:([^\\]]+)\\]`);
  for (const r of rows) {
    const m = r.description.match(re);
    if (m?.[1]) set.add(m[1]);
  }
  return set;
}

function isLevelComplete(level: LevelDef, answered: Set<string>): boolean {
  if (level.isChest) return false;
  if (level.questionIds.length === 0) return false;
  return level.questionIds.every((id) => answered.has(id));
}

async function buildPath(userId: number) {
  const allAnswers = await getLevelAnswers(userId);
  const completed = new Set<string>();
  let totalXp = 0;

  for (const level of LEVELS) {
    if (level.isChest || level.questionIds.length === 0) continue;
    const answered = answeredQuestionIds(allAnswers, level.id);
    const levelRows = allAnswers.filter((r) => r.description.includes(`[${level.id}:`));
    totalXp += levelRows.reduce((s, r) => s + (r.xpGained || 0), 0);
    if (isLevelComplete(level, answered)) completed.add(level.id);
  }

  // Chest claimed?
  const chestClaimed = allAnswers.some((r) => r.description.includes("[chest1:claim]"));
  if (chestClaimed) completed.add("chest1");

  const nodes = LEVELS.map((level) => {
    const answered = answeredQuestionIds(allAnswers, level.id);
    const done = level.isChest ? chestClaimed : isLevelComplete(level, answered);
    const reqOk = !level.requires || completed.has(level.requires);
    let status: "done" | "active" | "locked" = "locked";
    if (done) status = "done";
    else if (reqOk && (level.questionIds.length > 0 || level.isChest)) status = "active";
    else if (reqOk && level.questionIds.length === 0 && !level.isChest) status = "locked";

    const correctCount = level.questionIds.filter((qid) => {
      const row = allAnswers.find((r) => r.description.includes(tag(level.id, qid)));
      return row && (row.xpGained || 0) > 0;
    }).length;

    return {
      id: level.id,
      title: level.title,
      subtitle: level.subtitle,
      kind: level.kind,
      offset: level.offset,
      status,
      isChest: !!level.isChest,
      totalQuestions: level.questionIds.length,
      answeredCount: answered.size,
      correctCount,
      playable: status === "active" || status === "done",
    };
  });

  return {
    xpPerCorrect: XP_PER_CORRECT,
    xpFromPath: totalXp,
    unitTitle: "القسم ١، الوحدة ١",
    unitSubtitle: "أساسيات التداول: ابدأ رحلتك",
    nodes,
  };
}

// GET /education/path
router.get("/education/path", async (_req, res): Promise<void> => {
  await getOrCreateUser(1);
  res.json(await buildPath(1));
});

// GET /education/level/:levelId
router.get("/education/level/:levelId", async (req, res): Promise<void> => {
  const levelId = Array.isArray(req.params.levelId) ? req.params.levelId[0] : req.params.levelId;
  const level = LEVELS.find((l) => l.id === levelId);
  if (!level) {
    res.status(404).json({ error: "Level not found" });
    return;
  }

  const userId = 1;
  await getOrCreateUser(userId);
  const path = await buildPath(userId);
  const node = path.nodes.find((n) => n.id === levelId);
  if (!node?.playable && !level.isChest) {
    res.status(403).json({ error: "Level locked" });
    return;
  }

  const answers = await getLevelAnswers(userId, levelId);
  const answered = answeredQuestionIds(answers, levelId);

  if (level.isChest) {
    res.json({
      id: level.id,
      title: level.title,
      subtitle: level.subtitle,
      isChest: true,
      claimed: answers.some((r) => r.description.includes("[chest1:claim]")),
      rewardXp: 25,
      questions: [],
      completed: answers.some((r) => r.description.includes("[chest1:claim]")),
    });
    return;
  }

  const questions = level.questionIds.map((qid) => {
    const q = QUESTIONS[qid];
    return {
      id: q.id,
      question: q.question,
      options: q.options,
      answered: answered.has(qid),
    };
  });

  const completed = isLevelComplete(level, answered);
  const next = questions.find((q) => !q.answered);

  res.json({
    id: level.id,
    title: level.title,
    subtitle: level.subtitle,
    isChest: false,
    xpPerCorrect: XP_PER_CORRECT,
    questions,
    completed,
    nextQuestionId: next?.id ?? null,
    answeredCount: answered.size,
    totalQuestions: questions.length,
    correctCount: node?.correctCount ?? 0,
  });
});

// POST /education/level/:levelId/answer
router.post("/education/level/:levelId/answer", async (req, res): Promise<void> => {
  const levelId = Array.isArray(req.params.levelId) ? req.params.levelId[0] : req.params.levelId;
  const level = LEVELS.find((l) => l.id === levelId);
  if (!level || level.isChest) {
    res.status(404).json({ error: "Level not found" });
    return;
  }

  const userId = 1;
  const { questionId, selectedIndex, practice } = req.body ?? {};

  if (typeof questionId !== "string" || typeof selectedIndex !== "number") {
    res.status(400).json({ error: "questionId and selectedIndex required" });
    return;
  }

  if (!level.questionIds.includes(questionId)) {
    res.status(400).json({ error: "Question not in this level" });
    return;
  }

  const question = QUESTIONS[questionId];
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const path = await buildPath(userId);
  const node = path.nodes.find((n) => n.id === levelId);
  if (!node?.playable) {
    res.status(403).json({ error: "Level locked" });
    return;
  }

  const answers = await getLevelAnswers(userId, levelId);
  const already = answers.some((a) => a.description.includes(tag(levelId, questionId)));
  const correct = selectedIndex === question.correctIndex;

  // Practice / retry: grade without double XP
  if (already || practice === true) {
    res.json({
      correct,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      xpGained: 0,
      alreadyAnswered: true,
      practice: true,
      remaining: level.questionIds.filter(
        (id) => !answeredQuestionIds(answers, levelId).has(id) && id !== questionId,
      ).length,
      completed: isLevelComplete(level, answeredQuestionIds(answers, levelId)),
      correctCount: node.correctCount,
    });
    return;
  }

  const xpGained = correct ? XP_PER_CORRECT : 0;

  await db.insert(activityLogTable).values({
    userId,
    activityType: ACTIVITY_TYPE,
    title: correct ? `صح · ${level.title}` : `خطأ · ${level.title}`,
    description: `${tag(levelId, questionId)} ${question.question.slice(0, 50)}`,
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

  const updated = await getLevelAnswers(userId, levelId);
  const answered = answeredQuestionIds(updated, levelId);
  const completed = isLevelComplete(level, answered);
  const remaining = level.questionIds.filter((id) => !answered.has(id)).length;
  const correctCount = level.questionIds.filter((qid) => {
    const row = updated.find((r) => r.description.includes(tag(levelId, qid)));
    return row && (row.xpGained || 0) > 0;
  }).length;

  res.json({
    correct,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    xpGained,
    alreadyAnswered: false,
    practice: false,
    remaining,
    completed,
    correctCount,
    answeredCount: answered.size,
    totalQuestions: level.questionIds.length,
  });
});

// POST /education/level/chest1/claim
router.post("/education/level/:levelId/claim", async (req, res): Promise<void> => {
  const levelId = Array.isArray(req.params.levelId) ? req.params.levelId[0] : req.params.levelId;
  if (levelId !== "chest1") {
    res.status(400).json({ error: "Not a chest" });
    return;
  }

  const userId = 1;
  const path = await buildPath(userId);
  const node = path.nodes.find((n) => n.id === "chest1");
  if (!node || node.status === "locked") {
    res.status(403).json({ error: "Chest locked — أكمل المستوى ٢ أولاً" });
    return;
  }

  const answers = await getLevelAnswers(userId);
  if (answers.some((r) => r.description.includes("[chest1:claim]"))) {
    res.json({ claimed: true, xpGained: 0, message: "تم فتح الكنز مسبقاً" });
    return;
  }

  const rewardXp = 25;
  await db.insert(activityLogTable).values({
    userId,
    activityType: ACTIVITY_TYPE,
    title: "فتح كنز النقاط",
    description: "[chest1:claim] مكافأة المسار",
    xpGained: rewardXp,
    icon: "star",
  });

  const user = await getOrCreateUser(userId);
  await db
    .update(usersTable)
    .set({ xp: (user.xp ?? 0) + rewardXp })
    .where(eq(usersTable.id, userId));

  res.json({ claimed: true, xpGained: rewardXp, message: `ربحت +${rewardXp} XP من الكنز!` });
});

export default router;
