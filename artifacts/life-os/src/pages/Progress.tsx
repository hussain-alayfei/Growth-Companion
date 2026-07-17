import { AppLayout } from "@/components/layout/AppLayout";
import { Lumi } from "@/components/persona/Lumi";
import {
  useGetUserProfile,
  useGetBadges,
  useGetStreak,
  getGetUserProfileQueryKey,
  getGetBadgesQueryKey,
  getGetStreakQueryKey
} from "@workspace/api-client-react";
import { Flame, Trophy, Star, Shield } from "lucide-react";

export default function Progress() {
  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const { data: badges } = useGetBadges({ query: { queryKey: getGetBadgesQueryKey() } });
  const { data: streak } = useGetStreak({ query: { queryKey: getGetStreakQueryKey() } });

  return (
    <AppLayout>
      <div className="p-6 pt-10 flex flex-col gap-8 pb-32">
        <header className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary border-2 border-primary/50 flex items-center justify-center overflow-hidden">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="الصورة الشخصية" className="w-full h-full object-cover" />
            ) : (
              <Lumi emotion="happy" size={40} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.username || "المستخدم"}</h1>
            <p className="text-primary font-medium">المستوى {profile?.level || 1}</p>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-card-border p-5 rounded-3xl flex flex-col gap-1">
            <Flame className="w-6 h-6 text-orange-500 mb-2" />
            <span className="text-3xl font-bold">{streak?.currentStreak || 0}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">سلسلة الأيام</span>
          </div>
          <div className="bg-card border border-card-border p-5 rounded-3xl flex flex-col gap-1">
            <Trophy className="w-6 h-6 text-yellow-400 mb-2" />
            <span className="text-3xl font-bold">{profile?.longestStreak || 0}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">أفضل سلسلة</span>
          </div>
          <div className="bg-card border border-card-border p-5 rounded-3xl flex flex-col gap-1">
            <Star className="w-6 h-6 text-primary mb-2" />
            <span className="text-3xl font-bold">{profile?.totalTrades || 0}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">صفقات محاكاة</span>
          </div>
          <div className="bg-card border border-card-border p-5 rounded-3xl flex flex-col gap-1">
            <Shield className="w-6 h-6 text-emerald-500 mb-2" />
            <span className="text-3xl font-bold">{badges?.filter(b => b.earned).length || 0}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">الأوسمة</span>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-card border border-card-border p-6 rounded-3xl">
          <h3 className="text-lg font-bold mb-4">خريطة النشاط</h3>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 28 }).map((_, i) => {
              const intensity = Math.random();
              return (
                <div
                  key={i}
                  className={`w-[calc(14.28%-4px)] aspect-square rounded-sm ${
                    intensity > 0.7 ? "bg-primary" :
                    intensity > 0.4 ? "bg-primary/60" :
                    intensity > 0.1 ? "bg-primary/30" : "bg-secondary"
                  }`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>أقل نشاطاً</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-secondary" />
              <div className="w-3 h-3 rounded-sm bg-primary/30" />
              <div className="w-3 h-3 rounded-sm bg-primary/60" />
              <div className="w-3 h-3 rounded-sm bg-primary" />
            </div>
            <span>أكثر نشاطاً</span>
          </div>
        </div>

        {/* Badges */}
        <div>
          <h3 className="text-lg font-bold mb-4">الأوسمة</h3>
          <div className="grid grid-cols-3 gap-4">
            {badges?.map((badge) => (
              <div
                key={badge.id}
                className={`flex flex-col items-center text-center gap-2 p-3 rounded-2xl ${
                  badge.earned ? "bg-card border border-primary/30" : "bg-secondary/50 grayscale opacity-50"
                }`}
              >
                <div className="text-3xl">{badge.icon || "🏅"}</div>
                <div className="text-xs font-medium leading-tight">{badge.name}</div>
                {badge.earned && <div className="text-[10px] text-emerald-400 font-medium">مكتسب ✓</div>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
