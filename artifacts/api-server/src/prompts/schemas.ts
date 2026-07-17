import { z } from "zod";

export const CoachAdviceJsonSchema = z.object({
  message: z.string(),
  suggestions: z.array(z.string()),
  personaEmotion: z.enum(["thinking", "excited", "cautious", "proud", "teaching"]),
  learnMore: z.string().nullable(),
  refs: z.array(z.string()),
});

export const TradeReviewJsonSchema = z.object({
  riskLevel: z.enum(["low", "moderate", "high", "extreme"]),
  requiresConfirm: z.boolean(),
  warning: z.string().nullable(),
  coachFeedback: z.string(),
  alignmentScore: z.number().min(0).max(100),
  philosophyNotes: z.array(z.string()),
  questionsForUser: z.array(z.string()),
});

export const PostTradeJsonSchema = z.object({
  coachFeedback: z.string(),
  riskLevel: z.enum(["low", "moderate", "high", "extreme"]),
  warning: z.string().nullable(),
});

export const SessionReviewJsonSchema = z.object({
  summary: z.string(),
  alignmentScore: z.number().min(0).max(100),
  whatWentWell: z.array(z.string()),
  whatToImprove: z.array(z.string()),
  nextPractice: z.string(),
  personaEmotion: z.enum(["proud", "thoughtful", "cautious"]),
});

export const StockAnalysisJsonSchema = z.object({
  brief: z.string(),
  keyPoints: z.array(z.string()),
  risks: z.array(z.string()),
  educationalNote: z.string(),
});

export type CoachAdviceJson = z.infer<typeof CoachAdviceJsonSchema>;
export type TradeReviewJson = z.infer<typeof TradeReviewJsonSchema>;
export type PostTradeJson = z.infer<typeof PostTradeJsonSchema>;
export type SessionReviewJson = z.infer<typeof SessionReviewJsonSchema>;
export type StockAnalysisJson = z.infer<typeof StockAnalysisJsonSchema>;

/** OpenAI strict JSON schema objects (subset of JSON Schema). */
export const OPENAI_SCHEMAS = {
  coachAdvice: {
    name: "coach_advice",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["message", "suggestions", "personaEmotion", "learnMore", "refs"],
      properties: {
        message: { type: "string" },
        suggestions: { type: "array", items: { type: "string" } },
        personaEmotion: {
          type: "string",
          enum: ["thinking", "excited", "cautious", "proud", "teaching"],
        },
        learnMore: { type: ["string", "null"] },
        refs: { type: "array", items: { type: "string" } },
      },
    },
  },
  tradeReview: {
    name: "trade_review",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "riskLevel",
        "requiresConfirm",
        "warning",
        "coachFeedback",
        "alignmentScore",
        "philosophyNotes",
        "questionsForUser",
      ],
      properties: {
        riskLevel: { type: "string", enum: ["low", "moderate", "high", "extreme"] },
        requiresConfirm: { type: "boolean" },
        warning: { type: ["string", "null"] },
        coachFeedback: { type: "string" },
        alignmentScore: { type: "number" },
        philosophyNotes: { type: "array", items: { type: "string" } },
        questionsForUser: { type: "array", items: { type: "string" } },
      },
    },
  },
  postTrade: {
    name: "post_trade",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["coachFeedback", "riskLevel", "warning"],
      properties: {
        coachFeedback: { type: "string" },
        riskLevel: { type: "string", enum: ["low", "moderate", "high", "extreme"] },
        warning: { type: ["string", "null"] },
      },
    },
  },
  sessionReview: {
    name: "session_review",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "summary",
        "alignmentScore",
        "whatWentWell",
        "whatToImprove",
        "nextPractice",
        "personaEmotion",
      ],
      properties: {
        summary: { type: "string" },
        alignmentScore: { type: "number" },
        whatWentWell: { type: "array", items: { type: "string" } },
        whatToImprove: { type: "array", items: { type: "string" } },
        nextPractice: { type: "string" },
        personaEmotion: { type: "string", enum: ["proud", "thoughtful", "cautious"] },
      },
    },
  },
  stockAnalysis: {
    name: "stock_analysis",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["brief", "keyPoints", "risks", "educationalNote"],
      properties: {
        brief: { type: "string" },
        keyPoints: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        educationalNote: { type: "string" },
      },
    },
  },
} as const;
