import { AppLayout } from "@/components/layout/AppLayout";
import { Lumi } from "@/components/persona/Lumi";
import { DailyQuiz } from "@/components/education/DailyQuiz";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, BookOpen, TrendingUp, Shield, BarChart3, Brain, GraduationCap } from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

interface Lesson {
  id: string;
  title: string;
  summary: string;
  content: string;
  source: string;
  sourceUrl: string;
  difficulty: "مبتدئ" | "متوسط" | "متقدم";
  duration: string;
  tags: string[];
}

interface Category {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  lessons: Lesson[];
}

const SOURCES: Record<string, { name: string; badge: string; color: string }> = {
  investopedia:    { name: "Investopedia",      badge: "📊", color: "bg-blue-500/20 text-blue-300" },
  tradingview:     { name: "TradingView",        badge: "📈", color: "bg-teal-500/20 text-teal-300" },
  cfa:             { name: "CFA Institute",      badge: "🎓", color: "bg-amber-500/20 text-amber-300" },
  khan:            { name: "Khan Academy",        badge: "📚", color: "bg-emerald-500/20 text-emerald-300" },
  bloomberg:       { name: "Bloomberg Markets",  badge: "🔷", color: "bg-indigo-500/20 text-indigo-300" },
  wsj:             { name: "Wall Street Journal",badge: "📰", color: "bg-rose-500/20 text-rose-300" },
};

const CATEGORIES: Category[] = [
  {
    id: "basics",
    title: "أساسيات التداول",
    icon: BookOpen,
    color: "text-blue-400",
    lessons: [
      {
        id: "b1",
        title: "ما هو سوق الأسهم؟",
        summary: "تعرّف على آلية عمل البورصة وكيف تتحرك الأسعار.",
        content: `سوق الأسهم هو مكان يلتقي فيه المشترون والبائعون لتبادل حصص ملكية في الشركات. عندما تشتري سهماً، فأنت تمتلك جزءاً صغيراً من تلك الشركة وتستفيد من نموها.\n\n**كيف تتحدد الأسعار؟**\nيتحدد سعر السهم بناءً على العرض والطلب. إذا كان الطلب على السهم مرتفعاً (كثيرون يريدون الشراء) يرتفع السعر، والعكس صحيح.\n\n**مؤشرات رئيسية:**\n• S&P 500 — يتتبع أكبر 500 شركة أمريكية\n• Nasdaq — يركز على شركات التكنولوجيا\n• Dow Jones — يتتبع 30 شركة صناعية كبرى`,
        source: "investopedia",
        sourceUrl: "https://www.investopedia.com/terms/s/stockmarket.asp",
        difficulty: "مبتدئ",
        duration: "5 دقائق",
        tags: ["أسهم", "بورصة", "أساسيات"],
      },
      {
        id: "b2",
        title: "الفرق بين الأسهم والسندات",
        summary: "متى تختار السهم؟ ومتى تختار السند؟",
        content: `**الأسهم (Stocks)**\nتمثل حصة ملكية في شركة. عوائدها مرتفعة على المدى البعيد لكنها أكثر تقلباً. مناسبة للمستثمر الذي يتحمل المخاطرة ويفكر طويل المدى.\n\n**السندات (Bonds)**\nقروض تمنحها للحكومة أو الشركات مقابل فائدة ثابتة. أكثر استقراراً وأقل عائداً. مناسبة لمن يريد الحفاظ على رأس المال.\n\n**التوازن الذهبي:**\nيوصي خبراء CFA بتوزيع المحفظة بين الفئتين بحسب العمر والأهداف المالية. القاعدة الشهيرة: خصص نسبة مئوية للسندات مساوية لعمرك.`,
        source: "cfa",
        sourceUrl: "https://www.cfainstitute.org/en/membership/professional-development/refresher-readings/introduction-asset-classes",
        difficulty: "مبتدئ",
        duration: "7 دقائق",
        tags: ["أسهم", "سندات", "محفظة"],
      },
    ],
  },
  {
    id: "technical",
    title: "التحليل الفني والشموع",
    icon: BarChart3,
    color: "text-emerald-400",
    lessons: [
      {
        id: "t1",
        title: "الشموع اليابانية — قراءة شاملة",
        summary: "كيف تقرأ الشموع وتفهم ما تخبرك به السوق.",
        content: `الشمعة اليابانية تتكون من أربعة أسعار: الافتتاح، الإغلاق، الأعلى، الأدنى.\n\n**مكونات الشمعة:**\n• الجسم (Body) — المسافة بين الافتتاح والإغلاق\n• الفتيل العلوي — الأعلى حتى الحد الأقصى للسعر\n• الفتيل السفلي — الأدنى حتى الحد الأدنى للسعر\n\n**الأنماط الأساسية:**\n🟢 **الشمعة البيضاء/الخضراء** — إغلاق > افتتاح (شراء)\n🔴 **الشمعة السوداء/الحمراء** — إغلاق < افتتاح (بيع)\n⬜ **Doji** — الافتتاح = الإغلاق تقريباً (تردد)\n🔨 **المطرقة (Hammer)** — فتيل سفلي طويل، إشارة انعكاس صعودي\n⭐ **النجمة الصباحية** — نمط ثلاثي شمعات، إشارة بداية صعود\n\n**القاعدة الذهبية:** لا تقرأ شمعة واحدة في عزلة — دائماً اقرأها في سياق الاتجاه العام.`,
        source: "investopedia",
        sourceUrl: "https://www.investopedia.com/terms/c/candlestick.asp",
        difficulty: "متوسط",
        duration: "10 دقائق",
        tags: ["شموع", "تحليل فني", "أنماط"],
      },
      {
        id: "t2",
        title: "المتوسطات المتحركة (MA)",
        summary: "أداة لتصفية الضوضاء وتحديد الاتجاه الحقيقي.",
        content: `المتوسط المتحرك يحسب متوسط الأسعار خلال فترة زمنية محددة، مما يُظهر الاتجاه العام بعيداً عن التقلبات اليومية.\n\n**الأنواع الرئيسية:**\n• **SMA (بسيط)** — متوسط الأسعار خلال N يوم بالتساوي\n• **EMA (أسي)** — يُعطي وزناً أكبر للأسعار الحديثة\n\n**استخدامات عملية:**\n• MA 50 يوم — اتجاه قصير المدى\n• MA 200 يوم — اتجاه طويل المدى\n\n**إشارة الذهب (Golden Cross):** تقاطع MA50 فوق MA200 = إشارة شراء قوية\n**إشارة الموت (Death Cross):** تقاطع MA50 تحت MA200 = إشارة بيع\n\n**نصيحة TradingView:** ابدأ بـ EMA 20 على الرسم البياني اليومي كمرجع أساسي.`,
        source: "tradingview",
        sourceUrl: "https://www.tradingview.com/wiki/Moving_Average/",
        difficulty: "متوسط",
        duration: "8 دقائق",
        tags: ["متوسطات", "اتجاه", "تحليل فني"],
      },
      {
        id: "t3",
        title: "مستويات الدعم والمقاومة",
        summary: "أماكن الشراء والبيع التي يراقبها المتداولون المحترفون.",
        content: `**الدعم (Support)**\nمستوى سعري يميل السوق للارتداد منه صعوداً. يتشكل عندما يرى المشترون قيمة جيدة عند سعر معين.\n\n**المقاومة (Resistance)**\nمستوى سعري يميل السوق للتراجع منه. يتشكل عندما يبدأ البائعون بجني الأرباح.\n\n**كيف أحدده؟**\n1. ابحث عن القمم والقيعان السابقة في الرسم البياني\n2. أي مستوى تراجع منه السعر مرتين فأكثر = دعم أو مقاومة قوي\n3. كلما تكسّر مستوى، كلما كان أقوى\n\n**القاعدة:** الدعم المكسور يتحول إلى مقاومة، والمقاومة المكسورة تتحول إلى دعم.`,
        source: "investopedia",
        sourceUrl: "https://www.investopedia.com/trading/support-and-resistance-basics/",
        difficulty: "متوسط",
        duration: "8 دقائق",
        tags: ["دعم", "مقاومة", "تحليل فني"],
      },
    ],
  },
  {
    id: "fundamental",
    title: "التحليل الأساسي",
    icon: TrendingUp,
    color: "text-amber-400",
    lessons: [
      {
        id: "f1",
        title: "كيف تقرأ القوائم المالية؟",
        summary: "ثلاثة تقارير تكشف الحقيقة الكاملة عن أي شركة.",
        content: `**١. قائمة الدخل (Income Statement)**\nتُظهر إيرادات الشركة، تكاليفها، وصافي الربح خلال فترة. ابحث عن نمو مستمر في الإيرادات والهوامش.\n\n**٢. الميزانية العمومية (Balance Sheet)**\nتُظهر ما تملكه الشركة (الأصول) وما عليها (الخصوم). المعادلة: الأصول = الخصوم + حقوق المساهمين.\n\n**٣. قائمة التدفقات النقدية (Cash Flow)**\nالأهم من الثلاثة — تُظهر النقد الفعلي الداخل والخارج. الأرباح قد تُزوَّر، لكن التدفق النقدي أصعب تزويراً.\n\n**مؤشرات مهمة:**\n• P/E Ratio — مقارنة السعر بالأرباح\n• ROE — العائد على حقوق المساهمين\n• Debt/Equity — مستوى المديونية`,
        source: "cfa",
        sourceUrl: "https://www.cfainstitute.org/en/membership/professional-development/refresher-readings/financial-statement-analysis",
        difficulty: "متوسط",
        duration: "12 دقائق",
        tags: ["قوائم مالية", "تحليل أساسي"],
      },
      {
        id: "f2",
        title: "تقييم الشركات — نموذج DCF",
        summary: "الطريقة التي يستخدمها وارن بافيت لتحديد القيمة الحقيقية.",
        content: `**DCF — التدفق النقدي المخصوم**\nيُقدّر قيمة الشركة بناءً على التدفقات النقدية المستقبلية المتوقعة، مخصومةً إلى قيمتها الحالية.\n\n**الفكرة الأساسية:**\nالدولار اليوم يساوي أكثر من الدولار غداً (بسبب التضخم وتكلفة الفرصة البديلة).\n\n**الخطوات:**\n1. توقع التدفقات النقدية للـ 5-10 سنوات القادمة\n2. حدد معدل الخصم (عادةً 8-12%)\n3. احسب القيمة الطرفية بعد الفترة المتوقعة\n4. اجمع الأرقام المخصومة\n\n**متى يُستخدم؟**\nمثالي للشركات ذات التدفقات النقدية المستقرة والمتوقعة. غير مناسب للشركات الناشئة.`,
        source: "bloomberg",
        sourceUrl: "https://www.bloomberg.com/features/2019-what-is-dcf/",
        difficulty: "متقدم",
        duration: "15 دقائق",
        tags: ["تقييم", "DCF", "بافيت"],
      },
    ],
  },
  {
    id: "risk",
    title: "إدارة المخاطر",
    icon: Shield,
    color: "text-rose-400",
    lessons: [
      {
        id: "r1",
        title: "قاعدة 1% — حماية رأس مالك",
        summary: "القاعدة الذهبية التي يتبعها كل متداول محترف.",
        content: `**القاعدة:**\nلا تخاطر في أي صفقة واحدة بأكثر من 1% من إجمالي رأس مالك.\n\n**مثال عملي:**\nإذا كانت محفظتك $10,000، فأقصى خسارة مقبولة في صفقة واحدة = $100\n\n**لماذا هذا مهم؟**\nحتى لو خسرت 10 صفقات متتالية، ستبقى تملك 90% من رأس مالك. الاستمرارية في السوق هي المفتاح.\n\n**حساب حجم الصفقة:**\nحجم الصفقة = (رأس المال × 1%) ÷ مسافة وقف الخسارة\n\n**وقف الخسارة (Stop Loss):**\nحدد دائماً مستوى السعر الذي ستخرج منه قبل فتح أي صفقة. لا تتفاوض مع نفسك بعد ذلك.`,
        source: "investopedia",
        sourceUrl: "https://www.investopedia.com/articles/trading/09/risk-management.asp",
        difficulty: "مبتدئ",
        duration: "6 دقائق",
        tags: ["مخاطر", "وقف الخسارة", "إدارة رأس المال"],
      },
      {
        id: "r2",
        title: "التنويع — لا تضع كل بيضك في سلة واحدة",
        summary: "كيف تبني محفظة تتحمل صدمات السوق.",
        content: `**التنويع عبر:**\n\n**١. القطاعات**\nلا تستثمر كل شيء في التكنولوجيا مثلاً. وزّع بين: التكنولوجيا، الصحة، الطاقة، المالي، السلع الاستهلاكية.\n\n**٢. الجغرافيا**\nأسواق الولايات المتحدة، أوروبا، الأسواق الناشئة — تتحرك أحياناً في اتجاهات مختلفة.\n\n**٣. أصناف الأصول**\nأسهم + سندات + ذهب + عقارات (REITs) = محفظة متوازنة حقيقية.\n\n**٤. الزمن (Dollar Cost Averaging)**\nاستثمر مبلغاً ثابتاً كل شهر بدلاً من استثمار كل شيء دفعة واحدة. هذا يُقلل تأثير التوقيت الخاطئ.\n\n**حد التنويع:**\nالتنويع الزائد يُضعف العوائد. 20-30 سهم من قطاعات مختلفة كافية.`,
        source: "khan",
        sourceUrl: "https://www.khanacademy.org/economics-finance-domain/core-finance/investment-vehicles-tutorial/diversification-tutorial/v/diversification",
        difficulty: "مبتدئ",
        duration: "8 دقائق",
        tags: ["تنويع", "محفظة", "مخاطر"],
      },
    ],
  },
  {
    id: "psychology",
    title: "علم نفس المتداول",
    icon: Brain,
    color: "text-purple-400",
    lessons: [
      {
        id: "p1",
        title: "الأخطاء النفسية التي تدمر المتداولين",
        summary: "العدو الأكبر في التداول ليس السوق — بل عقلك.",
        content: `**أخطاء نفسية شائعة:**\n\n**١. الخوف من الفوت (FOMO)**\nالشراء بعد ارتفاع كبير خوفاً من تفويت الفرصة. الحل: كل فرصة لها وقتها، والسوق دائماً يُتيح فرصاً جديدة.\n\n**٢. التحيز نحو الخسارة (Loss Aversion)**\nالإبقاء على الصفقات الخاسرة أملاً في تعافيها، وبيع الرابحة مبكراً. الحل: دع أرباحك تنمو، وأوقف خسائرك سريعاً.\n\n**٣. الثقة الزائدة (Overconfidence)**\nبعد سلسلة انتصارات تبدأ بالمخاطرة أكثر. الحل: التزم بقواعدك بغض النظر عن النتائج السابقة.\n\n**٤. التحقق من التحيز (Confirmation Bias)**\nتبحث فقط عن معلومات تؤكد رأيك وتتجاهل ما يعارضه.\n\n**الحل الشامل:** احتفظ بيومية تداول — سجّل كل صفقة وسببها وعاطفتك وقتها. هذا يُعريك أمام نفسك.`,
        source: "wsj",
        sourceUrl: "https://www.wsj.com/articles/the-psychology-of-investing",
        difficulty: "متوسط",
        duration: "9 دقائق",
        tags: ["نفسية", "أخطاء", "انضباط"],
      },
    ],
  },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  "مبتدئ": "bg-emerald-500/20 text-emerald-300",
  "متوسط": "bg-amber-500/20 text-amber-300",
  "متقدم": "bg-rose-500/20 text-rose-300",
};

// ─── Components ───────────────────────────────────────────────────────────────

function LessonCard({ lesson }: { lesson: Lesson }) {
  const [expanded, setExpanded] = useState(false);
  const src = SOURCES[lesson.source];

  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      <button
        className="w-full p-4 text-right flex items-start justify-between gap-3"
        onClick={() => setExpanded(e => !e)}
      >
        <ChevronDown className={`w-5 h-5 text-muted-foreground mt-0.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[lesson.difficulty]}`}>
                {lesson.difficulty}
              </span>
              <span className="text-[10px] text-muted-foreground">{lesson.duration}</span>
            </div>
          </div>
          <h4 className="font-bold text-sm leading-snug">{lesson.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">{lesson.summary}</p>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="w-full h-px bg-card-border mb-4" />

              {/* Content rendered with basic formatting */}
              <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {lesson.content.split("\n").map((line, i) => {
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return <p key={i} className="font-bold text-foreground mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
                  }
                  if (line.startsWith("• ")) {
                    return <p key={i} className="text-foreground/80 pl-3 my-0.5 before:content-['•'] before:mr-2">{line.slice(2)}</p>;
                  }
                  if (line.match(/^\d+\./)) {
                    return <p key={i} className="text-foreground/80 my-0.5">{line}</p>;
                  }
                  if (line.trim() === "") return <div key={i} className="h-1" />;
                  return <p key={i} className="text-foreground/80">{line}</p>;
                })}
              </div>

              {/* Source badge */}
              <a
                href={lesson.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 ${src?.color}`}
                onClick={e => e.stopPropagation()}
              >
                <span>{src?.badge}</span>
                <span>{src?.name}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {lesson.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Education() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const totalLessons = CATEGORIES.reduce((s, c) => s + c.lessons.length, 0);

  const displayedCategories = activeCategory
    ? CATEGORIES.filter(c => c.id === activeCategory)
    : CATEGORIES;

  return (
    <AppLayout>
      <div className="p-6 pt-10 flex flex-col gap-6 pb-20">

        {/* Header */}
        <header className="flex items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">التعليم</h1>
            <p className="text-muted-foreground text-sm">مسار تفاعلي + دروس من مصادر عالمية</p>
          </div>
          <Lumi emotion="proud" size={56} />
        </header>

        {/* Duolingo-style level path */}
        <DailyQuiz />

        {/* Trusted sources banner */}
        <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-primary">مصادر موثوقة ومعتمدة</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(SOURCES).map(src => (
              <span key={src.name} className={`text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${src.color}`}>
                {src.badge} {src.name}
              </span>
            ))}
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" style={{ direction: "ltr" }}>
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              !activeCategory ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
            }`}
          >
            الكل
          </button>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeCategory === cat.id ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.title}
              </button>
            );
          })}
        </div>

        {/* Categories & Lessons */}
        <div className="flex flex-col gap-6">
          {displayedCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-xl bg-secondary flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${cat.color}`} />
                  </div>
                  <h2 className="font-bold">{cat.title}</h2>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {cat.lessons.length} دروس
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {cat.lessons.map(lesson => (
                    <LessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Lumi note */}
        <div className="bg-card border border-card-border rounded-3xl p-5 flex items-start gap-3 mt-2">
          <Lumi emotion="encouraging" size={40} />
          <div>
            <p className="text-sm font-bold mb-1">نصيحة لومي 💡</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              لا تحاول تعلم كل شيء دفعة واحدة. اقرأ درساً واحداً يومياً، وطبّقه على محفظتك التجريبية في قسم التداول. التعلم بالتطبيق هو الأسرع.
            </p>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
