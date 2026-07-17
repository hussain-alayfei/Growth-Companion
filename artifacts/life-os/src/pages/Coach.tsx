import { Lumi, LumiEmotion } from "@/components/persona/Lumi";
import {
  useGetCoachAdvice,
  useGetUserProfile,
  useUpdateSelectedCoach,
  useReviewTradingSession,
  getGetUserProfileQueryKey,
  CoachResponse,
  SessionReview,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, ArrowRight, ClipboardList, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useAppTheme } from "@/hooks/use-app-theme";
import { MarkdownMessage } from "@/components/ui/markdown-message";

interface Message {
  id: string;
  role: "user" | "coach";
  content: string;
  emotion?: LumiEmotion;
  suggestions?: string[];
}

const COACHES = [
  { id: "value" as const, name: "المستثمر القيمي", desc: "قيمة جوهرية وصبر" },
  { id: "growth" as const, name: "صائد النمو", desc: "نمو منضبط" },
  { id: "risk" as const, name: "حارس المخاطر", desc: "تحجيم ومخاطر" },
  { id: "technical" as const, name: "قارئ الشارت", desc: "حركة السعر" },
];

const SUGGESTED_QUESTIONS = [
  "ما هي أفضل استراتيجية للمبتدئين؟",
  "كيف أقرأ الشموع اليابانية؟",
  "ما الفرق بين التحليل الفني والأساسي؟",
  "كيف أدير المخاطر في التداول؟",
];

function mapEmotion(e?: string): LumiEmotion {
  if (e === "excited" || e === "proud" || e === "thinking" || e === "cautious" || e === "teaching") {
    if (e === "thinking" || e === "teaching") return "thoughtful";
    if (e === "cautious") return "warning";
    return e as LumiEmotion;
  }
  return "happy";
}

export default function Coach() {
  const queryClient = useQueryClient();
  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const updateCoach = useUpdateSelectedCoach();
  const reviewMutation = useReviewTradingSession();
  const coachMutation = useGetCoachAdvice();
  const { theme, toggleTheme } = useAppTheme();

  const selectedCoachId = profile?.selectedCoachId || "value";
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "coach",
      content:
        "مرحباً! أنا مدربك التعليمي في TradeUP. اختر فلسفة مدرب واحدة، ثم اسأل عن الأسهم والاستراتيجيات والمخاطر — بدون أوامر شراء/بيع مباشرة.",
      emotion: "happy",
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionReview, setSessionReview] = useState<SessionReview | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const mutateRef = useRef(coachMutation.mutate);
  mutateRef.current = coachMutation.mutate;

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, coachMutation.isPending, sessionReview]);

  const handleSelectCoach = (coachId: typeof COACHES[number]["id"]) => {
    updateCoach.mutate(
      { data: { coachId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "coach",
              content: `تم اختيار ${COACHES.find((c) => c.id === coachId)?.name}. سأعلّق على قراراتك وفق هذه الفلسفة.`,
              emotion: "happy",
            },
          ]);
        },
      },
    );
  };

  const handleSend = (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const history = [...messages, userMsg]
      .filter((m) => m.id !== "1")
      .slice(-8)
      .map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      }));

    mutateRef.current(
      {
        data: {
          question: userMsg.content,
          history,
          coachId: selectedCoachId as "value" | "growth" | "risk" | "technical",
        },
      },
      {
        onSuccess: (res: CoachResponse) => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "coach",
              content: res.message,
              emotion: mapEmotion(res.personaEmotion),
              suggestions: res.suggestions,
            },
          ]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "coach",
              content: "عذراً، المدرب غير متاح حالياً. تحقق من مفتاح OpenAI أو أعد المحاولة.",
              emotion: "warning",
            },
          ]);
        },
      },
    );
  };

  const handleSessionReview = () => {
    reviewMutation.mutate(
      { data: { coachId: selectedCoachId as "value" | "growth" | "risk" | "technical", limit: 20 } },
      {
        onSuccess: (res) => setSessionReview(res),
      },
    );
  };

  const lastCoach = [...messages].reverse().find((m) => m.role === "coach");
  const suggestionChips = lastCoach?.suggestions?.length ? lastCoach.suggestions : showDefaultSuggestions();

  function showDefaultSuggestions() {
    return messages.length <= 1 ? SUGGESTED_QUESTIONS : [];
  }

  const currentEmotion = coachMutation.isPending
    ? "thoughtful"
    : messages[messages.length - 1]?.role === "coach"
      ? messages[messages.length - 1].emotion
      : "idle";

  return (
    <div className="flex justify-center w-full min-h-[100dvh] bg-black light:bg-slate-100 transition-colors">
      <div className="w-full max-w-[430px] bg-background relative flex flex-col min-h-[100dvh] overflow-hidden shadow-2xl">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-card-border p-4 pt-6">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex-1 text-center">
              <Lumi emotion={currentEmotion as LumiEmotion} size={56} />
              <h1 className="font-bold mt-1">المدرب الذكي</h1>
              <p className="text-xs text-muted-foreground">
                {COACHES.find((c) => c.id === selectedCoachId)?.name || "اختر مدرباً"}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-primary"
              title={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
              aria-label="تبديل المظهر"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={handleSessionReview}
              disabled={reviewMutation.isPending}
              className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-primary"
              title="مراجعة الجلسة"
            >
              {reviewMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ direction: "rtl" }}>
            {COACHES.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCoach(c.id)}
                className={`shrink-0 px-3 py-2 rounded-2xl text-xs border transition-colors ${
                  selectedCoachId === c.id
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-card border-card-border text-muted-foreground"
                }`}
              >
                <div className="font-bold">{c.name}</div>
                <div className="opacity-70">{c.desc}</div>
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-44 flex flex-col gap-4 no-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`max-w-[85%] p-4 rounded-3xl ${
                  msg.role === "user"
                    ? "bg-primary text-white self-start rounded-tl-sm"
                    : "bg-card border border-card-border text-foreground self-end rounded-tr-sm"
                }`}
                style={{ direction: "rtl" }}
              >
                {msg.role === "coach" ? (
                  <MarkdownMessage content={msg.content} />
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
              </motion.div>
            ))}

            {coachMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-card-border text-foreground p-4 rounded-3xl rounded-tr-sm self-end"
              >
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {sessionReview && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary/10 border border-primary/30 rounded-3xl p-5 self-stretch"
              style={{ direction: "rtl" }}
            >
              <h3 className="font-bold mb-2">مراجعة الجلسة</h3>
              <div className="mb-3">
                <MarkdownMessage content={sessionReview.summary} />
              </div>
              <p className="text-xs text-primary mb-2">التوافق: {Math.round(sessionReview.alignmentScore)}%</p>
              <div className="text-xs space-y-2">
                <div>
                  <span className="font-bold text-emerald-400">ما سار جيداً:</span>
                  <ul className="list-disc mr-4 mt-1">
                    {sessionReview.whatWentWell.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-bold text-amber-400">للتحسين:</span>
                  <ul className="list-disc mr-4 mt-1">
                    {sessionReview.whatToImprove.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
                <p className="pt-2 border-t border-primary/20">
                  <span className="font-bold">تمرين مقترح:</span> {sessionReview.nextPractice}
                </p>
              </div>
              <button onClick={() => setSessionReview(null)} className="mt-3 text-xs text-muted-foreground underline">
                إغلاق
              </button>
            </motion.div>
          )}

          <div ref={endOfMessagesRef} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-card-border pb-6">
          {suggestionChips.length > 0 && (
            <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar" style={{ direction: "rtl" }}>
              {suggestionChips.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="whitespace-nowrap text-xs bg-secondary text-muted-foreground px-3 py-2 rounded-full hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 px-4 pt-2">
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || coachMutation.isPending}
              className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 transition-transform hover:scale-105"
            >
              {coachMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اسأل المدرب عن التداول..."
              className="flex-1 bg-card border border-card-border rounded-full px-5 py-4 text-sm focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground text-right"
              style={{ direction: "rtl" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
