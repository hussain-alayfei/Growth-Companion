import { Link, useLocation } from "wouter";
import { Home, LineChart, Target, MessageCircle, GraduationCap, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/use-app-theme";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useAppTheme();

  const navItems = [
    { path: "/", icon: Home, label: "الرئيسية" },
    { path: "/trading", icon: LineChart, label: "التداول" },
    { path: "/education", icon: GraduationCap, label: "التعليم" },
    { path: "/progress", icon: Target, label: "تقدمي" },
  ];

  return (
    <div className="flex justify-center w-full min-h-[100dvh] bg-black light:bg-slate-100 transition-colors">
      <div className="w-full max-w-[430px] bg-background relative flex flex-col min-h-[100dvh] overflow-hidden shadow-2xl">
        <button
          onClick={toggleTheme}
          className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-card/80 backdrop-blur-xl border border-card-border flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          title={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
          aria-label="تبديل المظهر"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
        </button>

        <main className="flex-1 overflow-y-auto pb-24 no-scrollbar">
          {children}
        </main>

        <div className="absolute bottom-6 left-0 right-0 px-3 z-50">
          <nav className="bg-card/80 backdrop-blur-xl border border-card-border rounded-3xl py-3 px-4 flex items-center justify-between shadow-lg">
            {navItems.map((item) => {
              const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all duration-200 relative",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className={cn("text-[9px] font-medium leading-tight", isActive ? "text-primary" : "text-muted-foreground")}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {location !== "/coach" && (
          <div className="absolute bottom-28 left-6 z-40">
            <Link
              href="/coach"
              className="bg-accent text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-105 transition-transform"
            >
              <MessageCircle className="w-6 h-6" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
