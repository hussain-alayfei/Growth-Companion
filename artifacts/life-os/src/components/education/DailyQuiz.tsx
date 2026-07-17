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

type NodeKind = "lesson" | "story" | "listen" | "practice" | "chest";
type NodeStatus = "done" | "active" | "locked";

interface PathNode {
  id: string;
  title: string;
  subtitle: string;
  kind: NodeKind;
  offset: number;
  status: NodeStatus;
  isChest: boolean;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  playable: boolean;
}

interface PathData {
  xpPerCorrect: number;
  xpFromPath: number;
  unitTitle: string;
  unitSubtitle: string;
  nodes: PathNode[];
}

interface LevelQuestion {
  id: string;
  question: string;
  options: string[];
  answered: boolean;
}

interface LevelData {
  id: string;
  title: string;
  subtitle: string;
  isChest: boolean;
  claimed?: boolean;
  rewardXp?: number;
  xpPerCorrect?: number;
  questions: LevelQuestion[];
  completed: boolean;
  nextQuestionId: string | null;
  answeredCount: number;
  totalQuestions: number;
  correctCount: number;
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  xpGained: number;
  remaining: number;
  completed: boolean;
  correctCount: number;
  answeredCount?: number;
  totalQuestions?: number;
  practice?: boolean;
}

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

export function DailyQuiz() {
  const queryClient = useQueryClient();
  const [path, setPath] = useState<PathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [sessionOpen, setSessionOpen] = useState(false);
  const [level, setLevel] = useState<LevelData | null>(null);
  const [levelLoading, setLevelLoading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [chestMsg, setChestMsg] = useState<string | null>(null);

  const loadPath = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/education/path"));
      if (!res.ok) throw new Error("failed");
      setPath((await res.json()) as PathData);
    } catch {
      setError("تعذر تحميل المسار. حاول لاحقاً.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPath();
  }, [loadPath]);

  const current = level?.questions.find((q) => q.id === currentId) ?? null;
  const answeredInSession = level
    ? level.questions.filter((q) => q.answered).length
    : 0;

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function openNode(node: PathNode) {
    if (node.status === "locked") {
      showToast("هذا المستوى مقفول — أكمل المستوى السابق أولاً");
      return;
    }

    if (node.isChest) {
      setLevelLoading(true);
      setSessionOpen(true);
      setChestMsg(null);
      setShowVictory(false);
      setLevel(null);
      try {
        const res = await fetch(apiUrl(`/api/education/level/${node.id}`));
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "failed");
        setLevel(data as LevelData);
      } catch {
        showToast("تعذر فتح الكنز");
        setSessionOpen(false);
      } finally {
        setLevelLoading(false);
      }
      return;
    }

    setLevelLoading(true);
    setSessionOpen(true);
    setShowVictory(false);
    setResult(null);
    setSelected(null);
    setPracticeMode(false);
    setChestMsg(null);
    try {
      const res = await fetch(apiUrl(`/api/education/level/${node.id}`));
      const data = (await res.json()) as LevelData;
      if (!res.ok) throw new Error("failed");
      setLevel(data);

      if (data.completed) {
        // Completed before — show score, offer practice (don't pretend empty win)
        setShowVictory(true);
        setCurrentId(null);
      } else {
        const next = data.questions.find((q) => !q.answered);
        setCurrentId(next?.id ?? data.questions[0]?.id ?? null);
        setShowVictory(false);
      }
    } catch {
      showToast("تعذر فتح المستوى");
      setSessionOpen(false);
    } finally {
      setLevelLoading(false);
    }
  }

  async function claimChest() {
    if (!level?.isChest) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/education/level/${level.id}/claim`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "failed");
      setChestMsg(data.message || `ربحت +${data.xpGained} XP`);
      setLevel((prev) => (prev ? { ...prev, claimed: true, completed: true } : prev));
      void loadPath();
      void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey({ limit: 5 }) });
    } catch {
      showToast("تعذر فتح الكنز");
    } finally {
      setSubmitting(false);
    }
  }

  function startPractice() {
    if (!level) return;
    setPracticeMode(true);
    setShowVictory(false);
    setResult(null);
    setSelected(null);
    // Walk through all questions again
    setLevel((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q) => ({ ...q, answered: false })),
            completed: false,
          }
        : prev,
    );
    setCurrentId(level.questions[0]?.id ?? null);
  }

  async function submitAnswer(index: number) {
    if (!level || !current || submitting || result) return;
    setSelected(index);
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/education/level/${level.id}/answer`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: current.id,
          selectedIndex: index,
          practice: practiceMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "failed");
      const answer = data as AnswerResult;
      setResult(answer);

      setLevel((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          answeredCount: answer.answeredCount ?? prev.answeredCount + 1,
          correctCount: answer.correctCount,
          completed: answer.completed,
          questions: prev.questions.map((q) =>
            q.id === current.id ? { ...q, answered: true } : q,
          ),
        };
      });

      if (!practiceMode && answer.xpGained > 0) {
        void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey({ limit: 5 }) });
      }
    } catch {
      showToast("تعذر إرسال الإجابة");
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (!level) return;
    const next = level.questions.find((q) => !q.answered);
    if (!next) {
      setShowVictory(true);
      setCurrentId(null);
      setResult(null);
      setSelected(null);
      void loadPath();
      return;
    }
    setCurrentId(next.id);
    setSelected(null);
    setResult(null);
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#2a3a42] bg-[#131f24]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 40%, #58cc02 0%, transparent 42%), radial-gradient(circle at 80% 70%, #1cb0f6 0%, transparent 40%)",
        }}
      />

      <div className="relative z-10 flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5 text-[#ff4b4b]">
          <Heart className="w-5 h-5 fill-current" />
          <span className="text-sm font-extrabold">25</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#1cb0f6]">
          <Gem className="w-5 h-5" />
          <span className="text-sm font-extrabold">{120 + (path?.xpFromPath ?? 0)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#ff9600]">
          <Flame className="w-5 h-5 fill-current" />
          <span className="text-sm font-extrabold">
            {path?.nodes.filter((n) => n.status === "done" && !n.isChest).length ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[#ce82ff]">
          <Trophy className="w-4 h-4" />
          <span className="text-sm font-extrabold">+{path?.xpFromPath ?? 0} XP</span>
        </div>
      </div>

      <div className="relative z-10 mx-3 mb-2 rounded-2xl bg-[#58cc02] px-4 py-3 flex items-center gap-3 shadow-[0_4px_0_#46a302]">
        <div className="flex-1 text-right min-w-0">
          <p className="text-[11px] font-extrabold text-white/90">
            {path?.unitTitle ?? "القسم ١، الوحدة ١"}
          </p>
          <p className="text-sm font-extrabold text-white truncate">
            {path?.unitSubtitle ?? "أساسيات التداول"}
          </p>
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

      {!loading && path && (
        <div className="relative z-10 px-2 pb-8 pt-4 min-h-[520px]">
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
            />
          </svg>

          <div className="relative flex flex-col gap-14">
            {path.nodes.map((node) => {
              const isActive = node.status === "active";
              const isDone = node.status === "done";
              const isChest = node.isChest;

              let ring = "bg-[#3d4f58] text-[#afc0c8] shadow-[0_6px_0_#2b3a42]";
              if (isActive) ring = "bg-[#58cc02] text-white shadow-[0_6px_0_#46a302] scale-110";
              else if (isDone) ring = "bg-[#58cc02] text-white shadow-[0_6px_0_#46a302]";
              else if (isChest && isActive) ring = "bg-[#ffc800] text-[#7a5a00] shadow-[0_6px_0_#e5a500] scale-110";
              else if (isChest) ring = "bg-[#ffc800]/50 text-[#7a5a00] shadow-[0_6px_0_#e5a500]/50";

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
                      <div className="bg-white text-[#131f24] text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-lg relative">
                        {isChest ? "افتح" : "ابدأ"}
                        <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
                      </div>
                    </motion.div>
                  )}

                  <button
                    type="button"
                    onClick={() => void openNode(node)}
                    className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-transform active:translate-y-1 active:shadow-none ${ring}`}
                    aria-label={node.title}
                  >
                    {node.status === "locked" && !isChest ? (
                      <Lock className="w-7 h-7 opacity-80" />
                    ) : isDone && !isChest ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : isActive && !isChest ? (
                      <RefreshCw className="w-8 h-8" strokeWidth={2.5} />
                    ) : (
                      <NodeIcon kind={node.kind} className="w-7 h-7" />
                    )}
                  </button>

                  <div className="absolute -bottom-8 text-center whitespace-nowrap">
                    <p
                      className={`text-[11px] font-bold ${
                        isActive || isDone ? "text-white" : "text-white/35"
                      }`}
                    >
                      {node.title}
                    </p>
                    {node.totalQuestions > 0 && (
                      <p className="text-[10px] text-white/40">
                        {node.answeredCount}/{node.totalQuestions} أسئلة
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Level / quiz session */}
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
                  <p className="text-[11px] font-bold text-[#58cc02]">
                    {level?.subtitle ?? "مستوى تعليمي"}
                  </p>
                  <h3 className="text-lg font-extrabold text-white">
                    {level?.title ?? "جاري التحميل..."}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSessionOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#2a3a42] flex items-center justify-center text-white/70"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {levelLoading && (
                <p className="text-center text-white/50 py-10 text-sm">تحميل الأسئلة...</p>
              )}

              {/* Chest */}
              {!levelLoading && level?.isChest && (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#ffc800] flex items-center justify-center shadow-[0_6px_0_#e5a500]">
                    <Gift className="w-10 h-10 text-[#7a5a00]" />
                  </div>
                  <p className="text-white font-extrabold text-lg">كنز النقاط</p>
                  <p className="text-white/60 text-sm">
                    أكملت المستويات المطلوبة — افتح الكنز واحصل على +{level.rewardXp ?? 25} XP
                  </p>
                  {chestMsg && <p className="text-[#58cc02] font-bold text-sm">{chestMsg}</p>}
                  {!level.claimed ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void claimChest()}
                      className="bg-[#ffc800] text-[#7a5a00] font-extrabold px-8 py-3 rounded-2xl shadow-[0_4px_0_#e5a500] active:translate-y-1 active:shadow-none"
                    >
                      فتح الكنز
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSessionOpen(false)}
                      className="bg-[#58cc02] text-white font-extrabold px-8 py-3 rounded-2xl shadow-[0_4px_0_#46a302]"
                    >
                      رجوع للمسار
                    </button>
                  )}
                </div>
              )}

              {/* Victory / completed summary — only after real answers */}
              {!levelLoading && level && !level.isChest && showVictory && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#58cc02] flex items-center justify-center shadow-[0_6px_0_#46a302]">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-xl font-extrabold text-white">أكملت المستوى!</p>
                  <p className="text-sm text-white/70 leading-relaxed">
                    بناءً على إجاباتك:{" "}
                    <span className="text-[#58cc02] font-extrabold">
                      {level.correctCount}/{level.totalQuestions}
                    </span>{" "}
                    إجابات صحيحة
                  </p>
                  <p className="text-xs text-white/45">
                    كل سؤال خيارات متعددة من مجال التداول — صح أو خطأ مع شرح.
                  </p>
                  <div className="flex flex-col gap-2 w-full mt-2">
                    <button
                      type="button"
                      onClick={startPractice}
                      className="w-full bg-[#1cb0f6] text-white font-extrabold py-3 rounded-2xl shadow-[0_4px_0_#1899d6]"
                    >
                      تدرّب مرة أخرى (بدون XP إضافي)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSessionOpen(false);
                        void loadPath();
                      }}
                      className="w-full bg-[#58cc02] text-white font-extrabold py-3 rounded-2xl shadow-[0_4px_0_#46a302]"
                    >
                      رجوع للمسار
                    </button>
                  </div>
                </div>
              )}

              {/* Actual MCQ questions */}
              {!levelLoading && level && !level.isChest && !showVictory && current && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-[#2a3a42] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#58cc02] transition-all"
                        style={{
                          width: `${(answeredInSession / Math.max(level.totalQuestions, 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white/60">
                      {answeredInSession}/{level.totalQuestions}
                    </span>
                  </div>
                  {practiceMode && (
                    <p className="text-[11px] text-[#1cb0f6] font-bold text-center">وضع تدريب — بدون نقاط إضافية</p>
                  )}

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      className="flex flex-col gap-3"
                    >
                      <p className="text-[11px] font-bold text-white/40">اختر الإجابة الصحيحة</p>
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
                              {result.correct
                                ? `صحيح!${result.xpGained > 0 ? ` +${result.xpGained} XP` : ""}`
                                : "خطأ — شوف الشرح"}
                            </p>
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed">{result.explanation}</p>
                          <button
                            type="button"
                            onClick={goNext}
                            className="mt-1 self-stretch bg-[#58cc02] text-white text-sm font-extrabold px-4 py-3 rounded-2xl shadow-[0_4px_0_#46a302] active:translate-y-1 active:shadow-none"
                          >
                            {level.questions.some((q) => !q.answered) ? "السؤال التالي" : "عرض النتيجة"}
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
