import OpenAI from "openai";
import type { ZodType } from "zod";
import { buildCoachSystemPrompt, normalizeCoachId, type CoachId } from "../prompts/coaches";
import {
  CoachAdviceJsonSchema,
  TradeReviewJsonSchema,
  PostTradeJsonSchema,
  SessionReviewJsonSchema,
  StockAnalysisJsonSchema,
  OPENAI_SCHEMAS,
  type CoachAdviceJson,
  type TradeReviewJson,
  type PostTradeJson,
  type SessionReviewJson,
  type StockAnalysisJson,
} from "../prompts/schemas";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!client) {
    client = new OpenAI({ apiKey: key, timeout: 45_000 });
  }
  return client;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function chatJson<T>(
  messages: ChatMessage[],
  jsonSchema: { name: string; strict: boolean; schema: Record<string, unknown> },
  zodSchema: ZodType<T>,
): Promise<T | null> {
  const openai = getClient();
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: jsonSchema as {
          name: string;
          strict?: boolean;
          schema: Record<string, unknown>;
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return zodSchema.parse(parsed);
  } catch (err) {
    console.error("[openai] chatJson failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getCoachAdvice(params: {
  question: string;
  history?: { role: "user" | "assistant"; content: string }[];
  coachId?: string | null;
  portfolioSummary?: unknown;
  recentOrders?: unknown;
}): Promise<CoachAdviceJson> {
  const coachId = normalizeCoachId(params.coachId);
  const history = (params.history ?? []).slice(-8);

  const fallback: CoachAdviceJson = {
    message:
      "عذراً، المدرب الذكي غير متاح حالياً. تأكد من إعداد مفتاح OpenAI، ويمكنك متابعة التعلم من قسم التعليم والمحفظة المحاكاة.",
    suggestions: [
      "راجع درساً في التحليل الفني أو إدارة المخاطر",
      "اطلب معاينة صفقة قبل التنفيذ",
      "جرّب مراجعة الجلسة بعد التداول",
    ],
    personaEmotion: "teaching",
    learnMore: "TradeUP يستخدم gpt-4o-mini للردود التعليمية المنظمة.",
    refs: [],
  };

  const userPayload = {
    question: params.question,
    portfolioSummary: params.portfolioSummary ?? null,
    recentOrders: params.recentOrders ?? null,
  };

  const messages: ChatMessage[] = [
    { role: "system", content: buildCoachSystemPrompt(coachId) },
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    {
      role: "user",
      content: `أجب على سؤال المتعلم كمدرّب تعليمي. السياق:\n${JSON.stringify(userPayload, null, 2)}`,
    },
  ];

  const result = await chatJson(messages, OPENAI_SCHEMAS.coachAdvice, CoachAdviceJsonSchema);
  if (!result) return fallback;
  return { ...result, refs: result.refs ?? [] };
}

export async function getTradePreview(params: {
  coachId?: string | null;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  total: number;
  tradePercent: number;
  cashBalance: number;
  portfolioValue: number;
}): Promise<TradeReviewJson> {
  const coachId = normalizeCoachId(params.coachId);
  const heuristicConfirm = params.tradePercent > 25 || params.tradePercent > 40;
  const heuristicRisk: TradeReviewJson["riskLevel"] =
    params.tradePercent > 40 ? "extreme" : params.tradePercent > 25 ? "high" : params.tradePercent > 10 ? "moderate" : "low";

  const fallback: TradeReviewJson = {
    riskLevel: heuristicRisk,
    requiresConfirm: heuristicConfirm || heuristicRisk === "high" || heuristicRisk === "extreme",
    warning: heuristicConfirm
      ? `هذه الصفقة تمثل حوالي ${params.tradePercent.toFixed(0)}% من المحفظة — راجع حجم المركز.`
      : null,
    coachFeedback: `معاينة ${params.type === "buy" ? "شراء" : "بيع"} ${params.shares} من ${params.symbol} بسعر ~${params.price.toFixed(2)}. فكّر: هل الحجم مناسب لفلسفتك؟`,
    alignmentScore: heuristicRisk === "low" ? 75 : heuristicRisk === "moderate" ? 55 : 35,
    philosophyNotes: ["راجع تحجيم المركز قبل التنفيذ.", "لا تمنع الصفقة — لكن تأكد أن لديك سبباً واضحاً."],
    questionsForUser: ["ما فرضيتك لهذه الصفقة؟", "أين وقف الخسارة الذهني؟"],
  };

  const messages: ChatMessage[] = [
    { role: "system", content: buildCoachSystemPrompt(coachId) },
    {
      role: "user",
      content: `راجع صفقة محاكاة مقترحة قبل التنفيذ. إن كان الخطر مرتفعاً أو التوافق ضعيفاً ضع requiresConfirm=true. لا تمنع الصفقة.
البيانات:
${JSON.stringify(params, null, 2)}`,
    },
  ];

  const result = await chatJson(messages, OPENAI_SCHEMAS.tradeReview, TradeReviewJsonSchema);
  if (!result) return fallback;

  // Enforce PDF rule: high/extreme always needs confirm; never invent "block"
  if (result.riskLevel === "high" || result.riskLevel === "extreme" || result.alignmentScore < 40) {
    result.requiresConfirm = true;
  }
  return result;
}

export async function getPostTradeCommentary(params: {
  coachId?: string | null;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  total: number;
  tradePercent: number;
  gainLoss?: number | null;
}): Promise<PostTradeJson> {
  const coachId = normalizeCoachId(params.coachId);
  const riskLevel: PostTradeJson["riskLevel"] =
    params.tradePercent > 40 ? "extreme" : params.tradePercent > 25 ? "high" : params.tradePercent > 10 ? "moderate" : "low";

  const fallback: PostTradeJson = {
    coachFeedback: `تم تنفيذ ${params.type === "buy" ? "شراء" : "بيع"} ${params.symbol}. راجع قرارك: هل كان الحجم متوافقاً مع خطتك؟`,
    riskLevel,
    warning: riskLevel === "high" || riskLevel === "extreme" ? "حجم المركز مرتفع نسبياً — راقب المخاطر." : null,
  };

  const messages: ChatMessage[] = [
    { role: "system", content: buildCoachSystemPrompt(coachId) },
    {
      role: "user",
      content: `صفقة محاكاة نُفّذت للتو. علّق بهدوء وفق فلسفتك دون أوامر مباشرة:
${JSON.stringify(params, null, 2)}`,
    },
  ];

  return (await chatJson(messages, OPENAI_SCHEMAS.postTrade, PostTradeJsonSchema)) ?? fallback;
}

export async function getSessionReview(params: {
  coachId?: string | null;
  orders: unknown[];
  portfolioSummary?: unknown;
}): Promise<SessionReviewJson> {
  const coachId = normalizeCoachId(params.coachId);
  const fallback: SessionReviewJson = {
    summary:
      params.orders.length === 0
        ? "لم تنفّذ صفقات في هذه الجلسة. الجلسة الهادئة أيضاً قرار — استخدم الوقت للمراجعة والتعلم."
        : `راجعت ${params.orders.length} صفقة/صفقات. ركّز على العملية أكثر من النتيجة قصيرة المدى.`,
    alignmentScore: params.orders.length === 0 ? 70 : 60,
    whatWentWell: ["حضورك للتعلم", "استخدام المحاكاة بدل المخاطرة بأموال حقيقية"],
    whatToImprove: ["وضّح فرضية كل صفقة قبل التنفيذ", "اربط الحجم بتحمل المخاطر"],
    nextPractice: "نفّذ معاينة صفقة واحدة غداً واكتب سببك قبل التأكيد.",
    personaEmotion: "thoughtful",
  };

  const messages: ChatMessage[] = [
    { role: "system", content: buildCoachSystemPrompt(coachId) },
    {
      role: "user",
      content: `قدّم مراجعة هادئة لجلسة التداول المحاكاة ومدى توافق القرارات مع فلسفتك:
${JSON.stringify({ orders: params.orders, portfolioSummary: params.portfolioSummary }, null, 2)}`,
    },
  ];

  return (await chatJson(messages, OPENAI_SCHEMAS.sessionReview, SessionReviewJsonSchema)) ?? fallback;
}

export async function getStockAnalysis(params: {
  coachId?: string | null;
  symbol: string;
  name?: string;
  price: number;
  sector?: string;
  changePercent?: number;
  description?: string | null;
}): Promise<StockAnalysisJson & { symbol: string }> {
  const coachId = normalizeCoachId(params.coachId);
  const fallback = {
    symbol: params.symbol,
    brief: `${params.symbol} يتداول حول ${params.price.toFixed(2)} في قطاع ${params.sector ?? "غير محدد"}. استخدم هذا كسياق تعليمي فقط.`,
    keyPoints: ["راجع اتجاه السعر على المدى القصير والمتوسط", "افهم نشاط الشركة قبل أي قرار"],
    risks: ["التقلب السعري", "مخاطر القطاع", "قرارات عاطفية بدون خطة"],
    educationalNote: "هذا ملخص تعليمي من محاكاة TradeUP وليس توصية استثمارية.",
  };

  const messages: ChatMessage[] = [
    { role: "system", content: buildCoachSystemPrompt(coachId) },
    {
      role: "user",
      content: `قدّم ملخصاً تعليمياً قصيراً عن هذا السهم (ليس توصية):
${JSON.stringify(params, null, 2)}`,
    },
  ];

  const result = await chatJson(messages, OPENAI_SCHEMAS.stockAnalysis, StockAnalysisJsonSchema);
  if (!result) return fallback;
  return { symbol: params.symbol, ...result };
}

export type { CoachId };
