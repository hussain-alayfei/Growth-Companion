import { AppLayout } from "@/components/layout/AppLayout";
import { Lumi } from "@/components/persona/Lumi";
import {
  useGetDashboardSummary,
  useGetRecentActivity,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Flame, LineChart, GraduationCap, MessageCircle } from "lucide-react";
import { Link } from "wouter";

const COACH_LABELS: Record<string, string> = {
  value: "المستثمر القيمي",
  growth: "صائد النمو",
  risk: "حارس المخاطر",
  technical: "قارئ الشارت",
};

export default function Home() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity(
    { limit: 5 },
    { query: { queryKey: getGetRecentActivityQueryKey({ limit: 5 }) } },
  );

  const isLoading = loadingSummary || loadingActivity;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full min-h-screen">
          <Lumi emotion="thoughtful" size={80} />
        </div>
      </AppLayout>
    );
  }

  const level = summary?.level || 1;
  const xp = summary?.xp || 0;
  const xpNext = summary?.xpToNextLevel || 500;
  const progress = Math.min(100, (xp / (xp + xpNext)) * 100);
  const coachId = summary?.selectedCoachId || "value";

  return (
    <AppLayout>
      <div className="p-6 pt-10 flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">TRADEUP</h1>
              <h2 className="text-2xl font-bold mt-1">المستوى {level}</h2>
            </div>
            <div className="flex items-center gap-2 bg-card border border-card-border px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-bold text-orange-500">{summary?.streak || 0}</span>
            </div>
          </div>

          <div className="w-full bg-card-border h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
            />
          </div>
          <div className="text-xs text-muted-foreground text-left">
            {xp} XP · متبقي {xpNext} للمستوى التالي
          </div>
        </header>

        <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <Lumi emotion="happy" size={72} />
            <div>
              <h3 className="text-lg font-medium text-white mb-1">
                {summary?.personaMessage || "مستعد لجلسة تداول تعليمية؟"}
              </h3>
              <p className="text-xs text-muted-foreground">مدربك: {COACH_LABELS[coachId] || coachId}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/trading" className="bg-card border border-card-border rounded-3xl p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <LineChart className="w-4 h-4 text-emerald-500" />
              </div>
              <h4 className="font-medium text-muted-foreground">صفقات اليوم</h4>
            </div>
            <div className="text-2xl font-bold">
              {summary?.tradeStats?.tradesToday || 0}
              <span className="text-sm text-muted-foreground font-normal">/{summary?.tradeStats?.totalTrades || 0} إجمالي</span>
            </div>
          </Link>

          <Link href="/education" className="bg-card border border-card-border rounded-3xl p-5 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary" />
              </div>
              <h4 className="font-medium text-muted-foreground">التعليم</h4>
            </div>
            <div className="text-sm font-bold text-foreground/90">مسارات التداول</div>
          </Link>
        </div>

        <Link href="/trading" className="bg-card border border-card-border rounded-3xl p-6 hover:scale-[1.02] transition-transform flex flex-col gap-2">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <LineChart className="w-4 h-4" />
            <span className="font-medium text-sm">المحفظة الاستثمارية</span>
          </div>
          <div className="text-3xl font-bold tracking-tight">
            $
            {summary?.portfolioSnapshot?.totalValue?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"}
          </div>
          {summary?.portfolioSnapshot?.dayChange !== undefined && (
            <div
              className={`text-sm font-medium ${
                (summary.portfolioSnapshot.dayChange ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {(summary.portfolioSnapshot.dayChange ?? 0) >= 0 ? "+" : ""}
              {summary.portfolioSnapshot.dayChangePercent?.toFixed(2)}% اليوم
            </div>
          )}
        </Link>

        <Link
          href="/coach"
          className="bg-accent/20 border border-accent/40 rounded-3xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold">المدرب الذكي</h4>
            <p className="text-xs text-muted-foreground">اسأل، راجع صفقاتك، واختر فلسفة المدرب</p>
          </div>
        </Link>

        <div className="flex flex-col gap-4 pb-4">
          <h3 className="text-lg font-bold">النشاط الأخير</h3>
          <div className="flex flex-col gap-3">
            {activity?.map((item) => (
              <div key={item.id} className="bg-card border border-card-border rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl flex-shrink-0">
                    {item.icon || "✨"}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="text-sm font-bold text-orange-400 shrink-0 mr-2">+{item.xpGained} XP</div>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <div className="text-center text-muted-foreground py-4 text-sm">لا يوجد نشاط بعد. ابدأ صفقة محاكاة!</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
