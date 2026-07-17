import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Sparkles, Trophy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answered: boolean;
}

interface QuizToday {
  date: string;
  xpPerCorrect: number;
  xpEarnedToday: number;
  remaining: number;
  total: number;
  questions: QuizQuestion[];
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  xpGained: number;
  remaining: number;
  xpEarnedToday: number;
}

function apiUrl(path: string) {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  return `${base}${path}`;
}

export function DailyQuiz() {
  const queryClient = useQueryClient();
  const [quiz, setQuiz] = useState<QuizToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/education/quiz/today"));
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as QuizToday;
      setQuiz(data);
      const next = data.questions.find((q) => !q.answered);
      setCurrentId(next?.id ?? null);
      setSelected(null);
      setResult(null);
    } catch {
      setError("تعذر تحميل الأسئلة. حاول لاحقاً.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  const current = quiz?.questions.find((q) => q.id === currentId) ?? null;
  const answeredCount = quiz ? quiz.total - quiz.remaining : 0;
  const progress = quiz ? (answeredCount / quiz.total) * 100 : 0;
  const done = quiz != null && quiz.remaining === 0;

  async function submitAnswer(index: number) {
    if (!current || submitting || result) return;
    setSelected(index);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/education/quiz/answer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: current.id, selectedIndex: index }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "failed");
      const answer = data as AnswerResult;
      setResult(answer);
      setQuiz((prev) =>
        prev
          ? {
              ...prev,
              remaining: answer.remaining,
              xpEarnedToday: answer.xpEarnedToday,
              questions: prev.questions.map((q) =>
                q.id === current.id ? { ...q, answered: true } : q,
              ),
            }
          : prev,
      );
      void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey({ limit: 5 }) });
    } catch {
      setError("تعذر إرسال الإجابة.");
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!quiz) return;
    const next = quiz.questions.find((q) => !q.answered);
    setCurrentId(next?.id ?? null);
    setSelected(null);
    setResult(null);
  }

  return (
    <section className="bg-gradient-to-br from-emerald-500/15 via-primary/10 to-transparent border border-emerald-500/25 rounded-3xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-bold text-emerald-400">تحدي يومي · مثل دولينجو</p>
          </div>
          <h2 className="text-xl font-bold">أسئلة اليوم</h2>
          <p className="text-xs text-muted-foreground mt-1">
            أجب عن أسئلة قصيرة واجمع نقاط XP يومياً
          </p>
        </div>
        <div className="text-left shrink-0 bg-secondary/80 rounded-2xl px-3 py-2">
          <p className="text-[10px] text-muted-foreground">نقاط اليوم</p>
          <p className="text-lg font-bold text-orange-400">+{quiz?.xpEarnedToday ?? 0}</p>
        </div>
      </div>

      {quiz && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              {answeredCount}/{quiz.total} أسئلة
            </span>
            <span>{quiz.xpPerCorrect} XP لكل إجابة صحيحة</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-400"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground text-center py-6">جاري تحميل الأسئلة...</p>
      )}

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {!loading && done && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-4 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-emerald-400" />
          </div>
          <p className="font-bold">أحسنت! أنهيت تحدي اليوم</p>
          <p className="text-sm text-muted-foreground">
            ربحت <span className="text-orange-400 font-bold">+{quiz?.xpEarnedToday ?? 0} XP</span> — عد غداً لأسئلة جديدة
          </p>
        </motion.div>
      )}

      {!loading && !done && current && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="flex flex-col gap-3"
          >
            <p className="font-medium leading-relaxed">{current.question}</p>
            <div className="flex flex-col gap-2">
              {current.options.map((opt, i) => {
                let style = "bg-secondary/70 hover:bg-secondary border-transparent";
                if (result) {
                  if (i === result.correctIndex) style = "bg-emerald-500/20 border-emerald-500/50";
                  else if (i === selected && !result.correct)
                    style = "bg-destructive/20 border-destructive/50";
                  else style = "bg-secondary/40 border-transparent opacity-60";
                } else if (selected === i) {
                  style = "bg-primary/20 border-primary/40";
                }
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!!result || submitting}
                    onClick={() => void submitAnswer(i)}
                    className={`text-right w-full rounded-2xl border px-4 py-3 text-sm transition-colors ${style}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-4 flex flex-col gap-2 ${
                  result.correct ? "bg-emerald-500/10" : "bg-destructive/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  {result.correct ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <p className="font-bold text-sm">
                    {result.correct ? `صحيح! +${result.xpGained} XP` : "إجابة خاطئة"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{result.explanation}</p>
                <button
                  type="button"
                  onClick={goNext}
                  className="mt-1 self-start bg-primary text-white text-sm font-medium px-4 py-2 rounded-full"
                >
                  {result.remaining > 0 ? "السؤال التالي" : "إنهاء التحدي"}
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
