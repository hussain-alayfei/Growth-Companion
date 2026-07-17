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
        message: {
          type: "string",
          description:
            "Markdown-formatted Arabic answer: short intro paragraph, then bullet points for multiple items. Bold only key terms. 3-6 sentences/points total.",
        },
        suggestions: {
          type: "array",
          items: { type: "string" },
          description: "2-4 short Arabic follow-up question chips, each under 8 words, no markdown.",
        },
        personaEmotion: {
          type: "string",
          enum: ["thinking", "excited", "cautious", "proud", "teaching"],
        },
        learnMore: {
          type: ["string", "null"],
          description: "Optional single-sentence deeper insight, plain text, no markdown.",
        },
        refs: {
          type: "array",
          items: { type: "string" },
          description: "0-3 short Arabic concept names referenced (plain text, no markdown, no URLs).",
        },
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
        warning: {
          type: ["string", "null"],
          description: "Plain-text single-sentence Arabic warning if risky, otherwise null.",
        },
        coachFeedback: {
          type: "string",
          description:
            "Markdown-formatted Arabic feedback from the coach's philosophy: 1 short intro sentence, then 2-4 bullet points covering position sizing and reasoning fit.",
        },
        alignmentScore: { type: "number" },
        philosophyNotes: {
          type: "array",
          items: { type: "string" },
          description: "2-3 short plain-text Arabic notes on how well this trade fits the coach's philosophy.",
        },
        questionsForUser: {
          type: "array",
          items: { type: "string" },
          description: "2-3 short plain-text Arabic reflective questions for the user to answer before confirming.",
        },
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
        coachFeedback: {
          type: "string",
          description:
            "Markdown-formatted Arabic post-trade commentary from the coach's philosophy: 2-4 sentences or bullet points, calm and reflective, no direct orders.",
        },
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
        summary: {
          type: "string",
          description:
            "Markdown-formatted Arabic session summary: 1-2 short paragraphs, calm tone, from the coach's philosophy perspective.",
        },
        alignmentScore: { type: "number" },
        whatWentWell: {
          type: "array",
          items: { type: "string" },
          description: "2-3 short plain-text Arabic positives, no markdown.",
        },
        whatToImprove: {
          type: "array",
          items: { type: "string" },
          description: "2-3 short plain-text Arabic improvement points, no markdown.",
        },
        nextPractice: {
          type: "string",
          description: "One concrete, short plain-text Arabic practice suggestion for the next session.",
        },
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
        brief: {
          type: "string",
          description: "1-2 short plain-text Arabic sentences describing the company/stock, educational only.",
        },
        keyPoints: {
          type: "array",
          items: { type: "string" },
          description: "2-4 short plain-text Arabic educational points about this stock, no markdown.",
        },
        risks: {
          type: "array",
          items: { type: "string" },
          description: "2-3 short plain-text Arabic risk factors, no markdown.",
        },
        educationalNote: {
          type: "string",
          description: "One short plain-text Arabic disclaimer that this is educational, not a recommendation.",
        },
      },
    },
  },
} as const;
