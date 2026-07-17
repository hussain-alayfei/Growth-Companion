import { AppLayout } from "@/components/layout/AppLayout";
import { Lumi } from "@/components/persona/Lumi";
import {
  useGetPortfolio,
  useGetStocks,
  usePreviewOrder,
  usePlaceOrder,
  useReviewTradingSession,
  getGetPortfolioQueryKey,
  getGetStocksQueryKey,
  OrderPreview,
  SessionReview,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Briefcase,
  CandlestickChart,
  ChevronDown,
  Loader2,
  ClipboardList,
  Search,
} from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MarkdownMessage } from "@/components/ui/markdown-message";
import {
  MARKETS,
  getStockMarket,
  marketLabel,
  type MarketId,
} from "@/lib/markets";

const generateSparkline = (start: number, end: number) => {
  const data = [];
  let current = start;
  for (let i = 0; i < 20; i++) {
    data.push({ value: current });
    current += (end - current) / (20 - i) + (Math.random() - 0.5) * 5;
  }
  data.push({ value: end });
  return data;
};

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

const generateOHLC = (basePrice: number, days = 40): Candle[] => {
  const data: Candle[] = [];
  let price = basePrice * 0.88;
  const monthNames = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  for (let i = days; i >= 0; i--) {
    const open = price;
    const delta = (Math.random() - 0.47) * price * 0.025;
    const close = Math.max(open + delta, open * 0.97);
    const high = Math.max(open, close) + Math.random() * price * 0.012;
    const low = Math.min(open, close) - Math.random() * price * 0.012;
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    data.push({ date: `${d.getDate()} ${monthNames[d.getMonth()]}`, open, high, low, close });
    price = close;
  }
  return data;
};

function CandlestickSVG({ data, width = 360, height = 200 }: { data: Candle[]; width?: number; height?: number }) {
  const maxP = Math.max(...data.map((d) => d.high));
  const minP = Math.min(...data.map((d) => d.low));
  const range = maxP - minP || 1;
  const pad = { top: 12, bottom: 24, left: 4, right: 4 };
  const chartH = height - pad.top - pad.bottom;
  const chartW = width - pad.left - pad.right;
  const slotW = chartW / data.length;
  const bodyW = Math.max(Math.floor(slotW * 0.6), 3);
  const toY = (p: number) => pad.top + chartH - ((p - minP) / range) * chartH;
  const labelEvery = Math.ceil(data.length / 5);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.top + chartH * (1 - t);
        const price = minP + range * t;
        return (
          <g key={t}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <text x={pad.left + 2} y={y - 3} fill="rgba(255,255,255,0.3)" fontSize={8}>
              ${price.toFixed(0)}
            </text>
          </g>
        );
      })}
      {data.map((c, i) => {
        const cx = pad.left + i * slotW + slotW / 2;
        const isGreen = c.close >= c.open;
        const color = isGreen ? "#10b981" : "#f43f5e";
        const bodyTop = Math.min(toY(c.open), toY(c.close));
        const bodyH = Math.max(Math.abs(toY(c.open) - toY(c.close)), 1.5);
        return (
          <g key={i}>
            <line x1={cx} y1={toY(c.high)} x2={cx} y2={toY(c.low)} stroke={color} strokeWidth={1} opacity={0.8} />
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} fillOpacity={0.85} rx={1} stroke={color} strokeWidth={0.5} />
          </g>
        );
      })}
      {data.map((c, i) => {
        if (i % labelEvery !== 0) return null;
        const cx = pad.left + i * slotW + slotW / 2;
        return (
          <text key={i} x={cx} y={height - 4} fill="rgba(255,255,255,0.35)" fontSize={7.5} textAnchor="middle">
            {c.date}
          </text>
        );
      })}
    </svg>
  );
}

type Tab = "portfolio" | "market" | "candles" | "trade";

export default function Trading() {
  const queryClient = useQueryClient();
  const { data: portfolio, isLoading: loadingPortfolio } = useGetPortfolio({
    query: { queryKey: getGetPortfolioQueryKey() },
  });
  const { data: stocks, isLoading: loadingStocks } = useGetStocks({
    query: { queryKey: getGetStocksQueryKey() },
  });

  const previewMutation = usePreviewOrder();
  const placeMutation = usePlaceOrder();
  const reviewMutation = useReviewTradingSession();

  const [activeTab, setActiveTab] = useState<Tab>("portfolio");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("NVDA");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState("1");
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [sessionReview, setSessionReview] = useState<SessionReview | null>(null);
  const [marketQuery, setMarketQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState<MarketId | "all">("all");

  const isPositive = (portfolio?.totalGainLoss || 0) >= 0;
  const allSymbols = useMemo(() => stocks?.map((s) => s.symbol) || [], [stocks]);
  const selectedStock = useMemo(() => stocks?.find((s) => s.symbol === selectedSymbol), [stocks, selectedSymbol]);
  const candleData = useMemo(() => (selectedStock ? generateOHLC(selectedStock.price) : []), [selectedStock]);

  const filteredStocks = useMemo(() => {
    if (!stocks) return [];
    const q = marketQuery.trim().toLowerCase();
    return stocks.filter((stock) => {
      const market = getStockMarket(stock.symbol);
      if (marketFilter !== "all" && market !== marketFilter) return false;
      if (!q) return true;
      const label = marketLabel(market);
      const marketMeta = MARKETS.find((m) => m.id === market);
      const terms = marketMeta?.searchTerms ?? [];
      if (terms.some((t) => t.toLowerCase() === q || q.includes(t.toLowerCase()) || t.toLowerCase().includes(q))) {
        return true;
      }
      const haystack = [stock.symbol, stock.name, stock.sector, stock.description ?? "", label]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [stocks, marketQuery, marketFilter]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "portfolio", label: "حيازاتي" },
    { key: "market", label: "السوق" },
    { key: "trade", label: "صفقة" },
    { key: "candles", label: "الشموع" },
  ];

  const invalidateTrading = () => {
    queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStocksQueryKey() });
  };

  const runPreview = () => {
    const n = parseFloat(shares);
    if (!selectedSymbol || !n || n <= 0) return;
    previewMutation.mutate(
      { data: { symbol: selectedSymbol, type: orderType, shares: n } },
      {
        onSuccess: (res) => {
          setPreview(res);
          if (res.requiresConfirm) {
            setConfirmOpen(true);
          } else {
            executeOrder(false);
          }
        },
        onError: () => setLastFeedback("تعذر معاينة الصفقة. تحقق من الرصيد أو الكمية."),
      },
    );
  };

  const executeOrder = (confirmed: boolean) => {
    const n = parseFloat(shares);
    placeMutation.mutate(
      { data: { symbol: selectedSymbol, type: orderType, shares: n, confirmed } },
      {
        onSuccess: (res) => {
          setConfirmOpen(false);
          setPreview(null);
          setLastFeedback(res.coachFeedback);
          invalidateTrading();
        },
        onError: (err: unknown) => {
          const apiErr = err as { status?: number; data?: { preview?: OrderPreview; error?: string } };
          if (apiErr?.status === 409 && apiErr?.data?.preview) {
            setPreview(apiErr.data.preview);
            setConfirmOpen(true);
            return;
          }
          setLastFeedback("تعذر تنفيذ الصفقة.");
        },
      },
    );
  };

  return (
    <AppLayout>
      <div className="p-6 pt-10 flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">التداول</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                reviewMutation.mutate(
                  { data: { limit: 20 } },
                  { onSuccess: (r) => setSessionReview(r) },
                )
              }
              className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-primary"
              title="مراجعة الجلسة"
            >
              {reviewMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
            </button>
            <Lumi emotion={isPositive ? "excited" : "thoughtful"} size={48} />
          </div>
        </header>

        {loadingPortfolio ? (
          <div className="h-[200px] bg-card border border-card-border rounded-3xl animate-pulse" />
        ) : (
          <div className="bg-card border border-card-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`} />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">قيمة المحفظة</span>
              <div className="text-4xl font-bold tracking-tight">
                ${portfolio?.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <div className="flex-1 bg-secondary rounded-2xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-medium">النقد</span>
                </div>
                <div className="font-bold">${portfolio?.cashBalance.toLocaleString()}</div>
              </div>
              <div className="flex-1 bg-secondary rounded-2xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs font-medium">العائد</span>
                </div>
                <div className={`font-bold flex items-center gap-1 ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(portfolio?.totalGainLossPercent || 0).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {lastFeedback && (
          <div className="bg-primary/10 border border-primary/25 rounded-2xl p-4" style={{ direction: "rtl" }}>
            <p className="text-xs font-bold text-primary mb-1">تعليق المدرب</p>
            <MarkdownMessage content={lastFeedback} />
            <button onClick={() => setLastFeedback(null)} className="block mt-2 text-xs text-muted-foreground underline">
              إغلاق
            </button>
          </div>
        )}

        {sessionReview && (
          <div className="bg-card border border-card-border rounded-2xl p-4 text-sm" style={{ direction: "rtl" }}>
            <h3 className="font-bold mb-2">مراجعة الجلسة</h3>
            <div className="mb-2">
              <MarkdownMessage content={sessionReview.summary} />
            </div>
            <p className="text-xs text-primary mb-2">التوافق: {Math.round(sessionReview.alignmentScore)}%</p>
            <p className="text-xs text-muted-foreground">{sessionReview.nextPractice}</p>
            <button onClick={() => setSessionReview(null)} className="mt-2 text-xs underline text-muted-foreground">
              إغلاق
            </button>
          </div>
        )}

        <div className="flex gap-1 bg-secondary p-1 rounded-2xl">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === t.key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.key === "candles" && <CandlestickChart className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-3 pb-10"
          >
            {activeTab === "portfolio" && (
              <>
                {portfolio?.holdings.map((holding) => {
                  const pos = holding.gainLoss >= 0;
                  return (
                    <div key={holding.symbol} className="bg-card border border-card-border p-5 rounded-2xl">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{holding.symbol}</h3>
                          <p className="text-xs text-muted-foreground">
                            {holding.shares} سهم · متوسط ${holding.avgCost.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${holding.currentPrice.toFixed(2)}</div>
                          <div className={`text-xs font-medium ${pos ? "text-emerald-500" : "text-rose-500"}`}>
                            {pos ? "+" : ""}
                            {holding.gainLossPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      <div className="h-10 opacity-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={generateSparkline(holding.avgCost, holding.currentPrice)}>
                            <YAxis domain={["dataMin", "dataMax"]} hide />
                            <Line type="monotone" dataKey="value" stroke={pos ? "#10b981" : "#f43f5e"} strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
                {portfolio?.holdings.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">لا توجد حيازات. افتح تبويب صفقة للبدء!</div>
                )}
              </>
            )}

            {activeTab === "market" && (
              <>
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="search"
                      value={marketQuery}
                      onChange={(e) => setMarketQuery(e.target.value)}
                      placeholder="ابحث عن شركة أو سوق (سعودي، عالمي، عربي...)"
                      className="w-full bg-secondary border border-card-border rounded-2xl pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                      style={{ direction: "rtl" }}
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    {MARKETS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMarketFilter(m.id)}
                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          marketFilter === m.id
                            ? "bg-primary text-white"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {filteredStocks.length} شركة
                    {marketFilter !== "all" ? ` · ${marketLabel(marketFilter)}` : ""}
                    {marketQuery.trim() ? ` · نتائج «${marketQuery.trim()}»` : ""}
                  </p>
                </div>

                {loadingStocks ? (
                  <div className="flex justify-center py-10">
                    <Lumi size={40} emotion="idle" />
                  </div>
                ) : filteredStocks.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    لا توجد نتائج. جرّب سوقاً آخر أو اسم شركة مختلف.
                  </div>
                ) : (
                  filteredStocks.map((stock) => {
                    const pos = stock.change >= 0;
                    const market = getStockMarket(stock.symbol);
                    return (
                      <button
                        key={stock.symbol}
                        onClick={() => {
                          setSelectedSymbol(stock.symbol);
                          setActiveTab("trade");
                        }}
                        className="bg-card border border-card-border p-4 rounded-2xl flex items-center gap-3 text-right w-full min-w-0"
                      >
                        <div className="min-w-0 flex-1 text-right">
                          <div className="flex items-center gap-2 justify-start flex-wrap">
                            <h3 className="font-bold">{stock.symbol}</h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                              {marketLabel(market)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{stock.name}</p>
                        </div>
                        <div className="w-16 h-10 opacity-60 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={generateSparkline(stock.price - stock.change, stock.price)}>
                              <YAxis domain={["dataMin", "dataMax"]} hide />
                              <Line type="monotone" dataKey="value" stroke={pos ? "#10b981" : "#f43f5e"} strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-left w-[76px] shrink-0">
                          <div className="font-bold text-sm">${stock.price.toFixed(2)}</div>
                          <div className={`text-xs font-medium ${pos ? "text-emerald-500" : "text-rose-500"}`}>
                            {pos ? "+" : ""}
                            {stock.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </>
            )}

            {activeTab === "trade" && (
              <div className="bg-card border border-card-border rounded-3xl p-5 flex flex-col gap-4" style={{ direction: "rtl" }}>
                <h3 className="font-bold text-lg">تنفيذ صفقة محاكاة</h3>
                <label className="text-xs text-muted-foreground">الرمز</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="bg-secondary rounded-xl px-4 py-3 text-sm"
                >
                  {allSymbols.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderType("buy")}
                    className={`flex-1 py-3 rounded-xl font-bold ${orderType === "buy" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-secondary"}`}
                  >
                    شراء
                  </button>
                  <button
                    onClick={() => setOrderType("sell")}
                    className={`flex-1 py-3 rounded-xl font-bold ${orderType === "sell" ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : "bg-secondary"}`}
                  >
                    بيع
                  </button>
                </div>
                <label className="text-xs text-muted-foreground">عدد الأسهم</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className="bg-secondary rounded-xl px-4 py-3 text-sm"
                />
                {selectedStock && (
                  <p className="text-xs text-muted-foreground">
                    السعر ≈ ${selectedStock.price.toFixed(2)} · الإجمالي ≈ $
                    {(selectedStock.price * (parseFloat(shares) || 0)).toFixed(2)}
                  </p>
                )}
                <button
                  onClick={runPreview}
                  disabled={previewMutation.isPending || placeMutation.isPending}
                  className="bg-primary text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {(previewMutation.isPending || placeMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  معاينة مع المدرب ثم تنفيذ
                </button>
                {preview && !confirmOpen && (
                  <div className="text-xs bg-secondary/60 rounded-xl p-3 space-y-1" style={{ direction: "rtl" }}>
                    <p className="font-bold text-primary">الخطر: {preview.riskLevel}</p>
                    <MarkdownMessage content={preview.coachFeedback} className="text-xs" />
                  </div>
                )}
              </div>
            )}

            {activeTab === "candles" && (
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <button
                    onClick={() => setPickerOpen((p) => !p)}
                    className="w-full bg-card border border-card-border rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CandlestickChart className="w-5 h-5 text-primary" />
                      <div className="text-right">
                        <p className="font-bold text-lg">{selectedSymbol}</p>
                        <p className="text-xs text-muted-foreground">{selectedStock?.name}</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {pickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full mt-2 left-0 right-0 bg-card border border-card-border rounded-2xl overflow-hidden z-20 shadow-xl"
                      >
                        <div className="max-h-52 overflow-y-auto no-scrollbar">
                          {allSymbols.map((sym) => (
                            <button
                              key={sym}
                              onClick={() => {
                                setSelectedSymbol(sym);
                                setPickerOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-right text-sm font-medium hover:bg-secondary/80 ${sym === selectedSymbol ? "text-primary" : ""}`}
                            >
                              {sym}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="bg-card border border-card-border rounded-3xl p-4 overflow-hidden">
                  <CandlestickSVG data={candleData} width={360} height={220} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmOpen && preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-end justify-center"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] bg-card border border-card-border rounded-t-3xl p-6 space-y-4"
              style={{ direction: "rtl" }}
            >
              <h3 className="text-xl font-bold">المدرب يحذّر — هل تؤكد؟</h3>
              <p className="text-sm text-amber-300">{preview.warning || "صفقة ذات مخاطر مرتفعة نسبياً."}</p>
              <MarkdownMessage content={preview.coachFeedback} />
              <ul className="text-xs text-muted-foreground list-disc mr-4 space-y-1">
                {preview.questionsForUser.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => executeOrder(true)}
                  disabled={placeMutation.isPending}
                  className="flex-1 bg-primary text-white py-3 rounded-2xl font-bold disabled:opacity-50"
                >
                  {placeMutation.isPending ? "جارٍ التنفيذ..." : "تأكيد الصفقة"}
                </button>
                <button onClick={() => setConfirmOpen(false)} className="flex-1 bg-secondary py-3 rounded-2xl font-bold">
                  إلغاء
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">المدرب لا يمنع الصفقة — القرار لك بعد التأكيد.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
