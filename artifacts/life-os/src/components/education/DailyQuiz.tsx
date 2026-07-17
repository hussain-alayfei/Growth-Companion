import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  BookOpen,
  Headphones,
  Dumbbell,
  Lock,
  Gift,
  Flame,
  Gem,
  Heart,
  X,
  NotebookPen,
  RefreshCw,
} from "lucide-react";
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

type NodeKind = "lesson" | "story" | "listen" | "practice" | "chest";
type NodeStatus = "done" | "active" | "locked";

interface PathNode {
  id: string;
  kind: NodeKind;
  title: string;
  playable: boolean;
  /** zigzag: negative = left, positive = right (in % from center) */
  offset: number;
}

const PATH_NODES: PathNode[] = [
  { id: "lvl1", kind: "lesson", title: "أساسيات السوق", playable: true, offset: 0 },
  { id: "lvl2", kind: "story", title: "قصة صفقة", playable: false, offset: 28 },
  { id: "chest1", kind: "chest", title: "كنز النقاط", playable: false, offset: -8 },
  { id: "lvl3", kind: "listen", title: "استمع وتعلّم", playable: false, offset: -30 },
  { id: "lvl4", kind: "practice", title: "تمرين سريع", playable: false, offset: 18 },
  { id: "lvl5", kind: "lesson", title: "إدارة المخاطر", playable: false, offset: 0 },
];

function apiUrl(path: string) {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  return `${base}${path}`;
}

function NodeIcon({ kind, className }: { kind: NodeKind; className?: string }) {
  const props = { className: className ?? "w-7 h-7" };
  switch (kind) {
    case "story":
      return <BookOpen {...props} />;
    case "listen":
      return <Headphones {...props} />;
    case "practice":
      return <Dumbbell {...props} />;
    case "chest":
      return <Gift {...props} />;
    default:
      return <Star {...props} />;
  }
}

/** Duolingo-style learning path: winding levels + quiz inside the active node. */
export function DailyQuiz() {
  const queryClient = useQueryClient();
  const [quiz, setQuiz] = useState<QuizToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
      setError("تعذر تحميل المسار. حاول لاحقاً.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  const answeredCount = quiz ? quiz.total - quiz.remaining : 0;
  const levelDone = quiz != null && quiz.remaining === 0;
  const current = quiz?.questions.find((q) => q.id === currentId) ?? null;

  function nodeStatus(node: PathNode, index: number): NodeStatus {
    if (node.playable) {
      if (levelDone) return "done";
      return "active";
    }
    // Unlock second node visually only after finishing level 1 (still not playable content)
    if (index === 1 && levelDone) return "locked";
    return "locked";
  }

  function openNode(node: PathNode, status: NodeStatus) {
    if (node.playable && (status === "active" || status === "done")) {
      setSessionOpen(true);
      if (quiz) {
        const next = quiz.questions.find((q) => !q.answered);
        setCurrentId(next?.id ?? null);
        setSelected(null);
        setResult(null);
      }
      return;
    }
    setToast("هذا المستوى مقفول — أكمل المستوى الحالي أولاً (قريباً المزيد!)");
    window.setTimeout(() => setToast(null), 2200);
  }

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
    if (!next) {
      setSessionOpen(false);
      setSelected(null);
      setResult(null);
      return;
    }
    setCurrentId(next.id);
    setSelected(null);
    setResult(null);
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#2a3a42] bg-[#131f24]">
      {/* Soft stage mascots / atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 40%, #58cc02 0%, transparent 42%), radial-gradient(circle at 80% 70%, #1cb0f6 0%, transparent 40%)",
        }}
      />

      {/* Stats bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5 text-[#ff4b4b]">
          <Heart className="w-5 h-5 fill-current" />
          <span className="text-sm font-extrabold">25</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#1cb0f6]">
          <Gem className="w-5 h-5" />
          <span className="text-sm font-extrabold">{(quiz?.xpEarnedToday ?? 0) * 12 + 120}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#ff9600]">
          <Flame className="w-5 h-5 fill-current" />
          <span className="text-sm font-extrabold">{levelDone ? 1 : 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#ce82ff]">
          <Trophy className="w-4 h-4" />
          <span className="text-sm font-extrabold">+{quiz?.xpEarnedToday ?? 0} XP</span>
        </div>
      </div>

      {/* Unit banner — Duolingo green */}
      <div className="relative z-10 mx-3 mb-2 rounded-2xl bg-[#58cc02] px-4 py-3 flex items-center gap-3 shadow-[0_4px_0_#46a302]">
        <div className="flex-1 text-right min-w-0">
          <p className="text-[11px] font-extrabold text-white/90">القسم ١، الوحدة ١</p>
          <p className="text-sm font-extrabold text-white truncate">أساسيات التداول: ابدأ رحلتك</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <NotebookPen className="w-5 h-5 text-white" />
        </div>
      </div>

      {loading && (
        <p className="relative z-10 text-center text-sm text-white/50 py-16">جاري تجهيز المسار...</p>
      )}
      {error && !loading && (
        <p className="relative z-10 text-center text-sm text-rose-400 py-8 px-4">{error}</p>
      )}

      {/* Winding path */}
      {!loading && (
        <div className="relative z-10 px-2 pb-8 pt-4 min-h-[520px]">
          {/* Path connector line (SVG zigzag) */}
          <svg
            className="absolute inset-x-0 top-8 bottom-8 w-full h-[460px] pointer-events-none opacity-40"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path
              d="M50 4 C 50 10, 78 14, 78 22 C 78 30, 42 34, 42 42 C 42 50, 20 54, 20 62 C 20 70, 68 74, 68 82 C 68 90, 50 94, 50 98"
              fill="none"
              stroke="#3d4f58"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="0"
            />
          </svg>

          <div className="relative flex flex-col gap-14">
            {PATH_NODES.map((node, index) => {
              const status = nodeStatus(node, index);
              const isActive = status === "active";
              const isDone = status === "done";
              const isChest = node.kind === "chest";

              let ring =
                "bg-[#3d4f58] text-[#afc0c8] shadow-[0_6px_0_#2b3a42]";
              if (isActive) {
                ring = "bg-[#58cc02] text-white shadow-[0_6px_0_#46a302] scale-110";
              } else if (isDone) {
                ring = "bg-[#58cc02] text-white shadow-[0_6px_0_#46a302]";
              } else if (isChest) {
                ring = "bg-[#ffc800] text-[#7a5a00] shadow-[0_6px_0_#e5a500]";
              }

              return (
                <div
                  key={node.id}
                  className="relative flex justify-center"
                  style={{ transform: `translateX(${node.offset}%)` }}
                >
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-9 z-20"
                    >
                      <div className="bg-white text-[#131f24] text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-lg">
                        ابدأ
                        <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
                      </div>
                    </motion.div>
                  )}

                  <button
                    type="button"
                    onClick={() => openNode(node, status)}
                    className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-transform active:translate-y-1 active:shadow-none ${ring}`}
                    aria-label={node.title}
                  >
                    {status === "locked" && !isChest ? (
                      <Lock className="w-7 h-7 opacity-80" />
                    ) : isDone && node.playable ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : isActive ? (
                      <RefreshCw className="w-8 h-8" strokeWidth={2.5} />
                    ) : (
                      <NodeIcon kind={node.kind} className="w-7 h-7" />
                    )}
                  </button>

                  <p
                    className={`absolute -bottom-6 text-[11px] font-bold whitespace-nowrap ${
                      isActive || isDone ? "text-white" : "text-white/35"
                    }`}
                  >
                    {node.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast for locked */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-4 left-4 right-4 z-30 bg-[#1a2a32] border border-[#3d4f58] text-white text-sm font-bold text-center rounded-2xl px-4 py-3 shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz session overlay */}
      <AnimatePresence>
        {sessionOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSessionOpen(false)}
          >
            <motion.div
              initial={{ y: 48 }}
              animate={{ y: 0 }}
              exit={{ y: 48 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] max-h-[92vh] overflow-y-auto bg-[#131f24] border border-[#2a3a42] rounded-t-[2rem] sm:rounded-[2rem] p-5 flex flex-col gap-4"
              style={{ direction: "rtl", fontFamily: "Almarai, sans-serif" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-[#58cc02]">المستوى ١ · أساسيات السوق</p>
                  <h3 className="text-lg font-extrabold text-white">أسئلة سريعة</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSessionOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#2a3a42] flex items-center justify-center text-white/70"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress hearts strip */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 rounded-full bg-[#2a3a42] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#58cc02] transition-all"
                    style={{
                      width: quiz ? `${(answeredCount / quiz.total) * 100}%` : "0%",
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-white/60">
                  {answeredCount}/{quiz?.total ?? 0}
                </span>
              </div>

              {levelDone && !current ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#58cc02] flex items-center justify-center shadow-[0_6px_0_#46a302]">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-xl font-extrabold text-white">أكملت المستوى!</p>
                  <p className="text-sm text-white/60">
                    ربحت{" "}
                    <span className="text-[#ff9600] font-extrabold">+{quiz?.xpEarnedToday ?? 0} XP</span>
                    {" "}— عد غداً لمستويات جديدة
                  </p>
                  <button
                    type="button"
                    onClick={() => setSessionOpen(false)}
                    className="mt-2 bg-[#58cc02] text-white font-extrabold px-8 py-3 rounded-2xl shadow-[0_4px_0_#46a302] active:translate-y-1 active:shadow-none"
                  >
                    رجوع للمسار
                  </button>
                </div>
              ) : current ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="flex flex-col gap-3"
                  >
                    <p className="text-base font-bold text-white leading-relaxed">{current.question}</p>
                    <div className="flex flex-col gap-2.5">
                      {current.options.map((opt, i) => {
                        let style =
                          "bg-[#1a2a32] border-[#3d4f58] text-white hover:border-[#58cc02]/60";
                        if (result) {
                          if (i === result.correctIndex)
                            style = "bg-[#58cc02]/20 border-[#58cc02] text-white";
                          else if (i === selected && !result.correct)
                            style = "bg-[#ff4b4b]/20 border-[#ff4b4b] text-white";
                          else style = "bg-[#1a2a32] border-[#2a3a42] text-white/40";
                        } else if (selected === i) {
                          style = "bg-[#1cb0f6]/15 border-[#1cb0f6] text-white";
                        }
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={!!result || submitting}
                            onClick={() => void submitAnswer(i)}
                            className={`text-right w-full rounded-2xl border-2 px-4 py-3.5 text-sm font-bold transition-colors ${style}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {result && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl p-4 flex flex-col gap-2 border-2 ${
                          result.correct
                            ? "bg-[#58cc02]/10 border-[#58cc02]/40"
                            : "bg-[#ff4b4b]/10 border-[#ff4b4b]/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {result.correct ? (
                            <CheckCircle2 className="w-5 h-5 text-[#58cc02]" />
                          ) : (
                            <XCircle className="w-5 h-5 text-[#ff4b4b]" />
                          )}
                          <p className="font-extrabold text-sm text-white">
                            {result.correct ? `صحيح! +${result.xpGained} XP` : "خطأ — حاول تتعلّم من الشرح"}
                          </p>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">{result.explanation}</p>
                        <button
                          type="button"
                          onClick={goNext}
                          className="mt-1 self-stretch bg-[#58cc02] text-white text-sm font-extrabold px-4 py-3 rounded-2xl shadow-[0_4px_0_#46a302] active:translate-y-1 active:shadow-none"
                        >
                          {result.remaining > 0 ? "متابعة" : "إنهاء المستوى"}
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <p className="text-center text-white/50 py-8 text-sm">لا توجد أسئلة متاحة الآن</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
