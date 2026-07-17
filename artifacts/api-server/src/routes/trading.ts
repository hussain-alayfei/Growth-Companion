import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  stocksTable,
  portfoliosTable,
  holdingsTable,
  ordersTable,
  tradingAlertsTable,
  usersTable,
  activityLogTable,
} from "@workspace/db";
import {
  GetPortfolioResponse,
  GetStocksResponse,
  GetStockHistoryResponse,
  GetOrdersResponse,
  PlaceOrderBody,
  PlaceOrderResponse,
  PreviewOrderBody,
  PreviewOrderResponse,
  GetCoachAdviceBody,
  GetCoachAdviceResponse,
  ReviewTradingSessionBody,
  ReviewTradingSessionResponse,
  AnalyzeStockResponse,
  GetTradingAlertsResponse,
  GetTradingInsightsResponse,
} from "@workspace/api-zod";
import {
  getCoachAdvice,
  getTradePreview,
  getPostTradeCommentary,
  getSessionReview,
  getStockAnalysis,
} from "../services/openai";

const router: IRouter = Router();

function generatePriceHistory(basePrice: number, days: number, symbol: string) {
  const seed = symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  let price = basePrice * 0.7;
  const prices = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStr = date.toISOString().split("T")[0];
    const r = ((seed * (days - i + 1) * 9301 + 49297) % 233280) / 233280;
    const trend = 0.0005;
    const change = (r - 0.48) * 0.04 + trend;
    price = Math.max(0.5, price * (1 + change));
    const open = price;
    const high = price * (1 + Math.abs(r - 0.5) * 0.02);
    const low = price * (1 - Math.abs(r - 0.5) * 0.015);
    const close = price * (1 + (r - 0.5) * 0.01);
    prices.push({
      date: dayStr,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(500000 + r * 5000000),
    });
  }
  return prices;
}

async function getOrCreatePortfolio(userId: number) {
  let [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.userId, userId));
  if (!portfolio) {
    [portfolio] = await db.insert(portfoliosTable).values({ userId, cashBalance: "10000.00" }).returning();
  }
  return portfolio;
}

async function getOrCreateUser(userId: number) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    [user] = await db.insert(usersTable).values({ id: userId }).returning();
  }
  return user;
}

async function buildPortfolioResponse(userId: number) {
  const portfolio = await getOrCreatePortfolio(userId);
  const holdings = await db
    .select()
    .from(holdingsTable)
    .where(and(eq(holdingsTable.userId, userId), eq(holdingsTable.portfolioId, portfolio.id)));

  const holdingsData = await Promise.all(
    holdings.map(async (h) => {
      const [stock] = await db.select().from(stocksTable).where(eq(stocksTable.symbol, h.symbol));
      const currentPrice = stock ? parseFloat(stock.currentPrice) : parseFloat(h.avgCost);
      const shares = parseFloat(h.shares);
      const avgCost = parseFloat(h.avgCost);
      const totalValue = shares * currentPrice;
      const gainLoss = totalValue - shares * avgCost;
      const gainLossPercent = avgCost > 0 ? (gainLoss / (shares * avgCost)) * 100 : 0;
      return {
        symbol: h.symbol,
        name: stock?.name ?? h.symbol,
        shares,
        avgCost,
        currentPrice,
        totalValue,
        gainLoss,
        gainLossPercent,
        sector: stock?.sector ?? "Unknown",
      };
    }),
  );

  const holdingsValue = holdingsData.reduce((sum, h) => sum + h.totalValue, 0);
  const cashBalance = parseFloat(portfolio.cashBalance);
  const totalValue = holdingsValue + cashBalance;
  const investedValue = holdingsData.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
  const totalGainLoss = holdingsValue - investedValue;
  const totalGainLossPercent = investedValue > 0 ? (totalGainLoss / investedValue) * 100 : 0;

  return {
    cashBalance,
    totalValue,
    totalGainLoss,
    totalGainLossPercent,
    dayGainLoss: totalGainLoss * 0.1,
    dayGainLossPercent: totalGainLossPercent * 0.1,
    holdings: holdingsData,
  };
}

router.get("/trading/portfolio", async (_req, res): Promise<void> => {
  const data = await buildPortfolioResponse(1);
  res.json(GetPortfolioResponse.parse(data));
});

router.get("/trading/stocks", async (_req, res): Promise<void> => {
  const stocks = await db.select().from(stocksTable).orderBy(stocksTable.symbol);
  const result = stocks.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    price: parseFloat(s.currentPrice),
    change: parseFloat(s.priceChange),
    changePercent: parseFloat(s.priceChangePercent),
    sector: s.sector,
    marketCap: s.marketCap ?? null,
    description: s.description ?? null,
    aiRating: s.aiRating ?? null,
  }));
  res.json(GetStocksResponse.parse(result));
});

router.get("/trading/stocks/:symbol/history/:period", async (req, res): Promise<void> => {
  const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const period = Array.isArray(req.params.period) ? req.params.period[0] : req.params.period;
  const [stock] = await db.select().from(stocksTable).where(eq(stocksTable.symbol, symbol.toUpperCase()));
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }
  const daysMap: Record<string, number> = { "1d": 1, "1w": 7, "1m": 30, "3m": 90, "1y": 365 };
  const days = daysMap[period] ?? 30;
  const history = generatePriceHistory(parseFloat(stock.currentPrice), days, symbol);
  res.json(GetStockHistoryResponse.parse(history));
});

router.post("/trading/stocks/:symbol/analyze", async (req, res): Promise<void> => {
  const symbol = Array.isArray(req.params.symbol) ? req.params.symbol[0] : req.params.symbol;
  const [stock] = await db.select().from(stocksTable).where(eq(stocksTable.symbol, symbol.toUpperCase()));
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }
  const user = await getOrCreateUser(1);
  const analysis = await getStockAnalysis({
    coachId: user.selectedCoachId,
    symbol: stock.symbol,
    name: stock.name,
    price: parseFloat(stock.currentPrice),
    sector: stock.sector,
    changePercent: parseFloat(stock.priceChangePercent),
    description: stock.description,
  });
  res.json(AnalyzeStockResponse.parse(analysis));
});

router.get("/trading/orders", async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, 1)).orderBy(desc(ordersTable.executedAt));
  const result = orders.map((o) => ({
    id: o.id,
    symbol: o.symbol,
    type: o.orderType,
    shares: parseFloat(o.shares),
    price: parseFloat(o.price),
    total: parseFloat(o.total),
    notes: o.notes ?? null,
    executedAt: o.executedAt.toISOString(),
  }));
  res.json(GetOrdersResponse.parse(result));
});

router.post("/trading/orders/preview", async (req, res): Promise<void> => {
  const parsed = PreviewOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = 1;
  const { symbol, type, shares } = parsed.data;
  const [stock] = await db.select().from(stocksTable).where(eq(stocksTable.symbol, symbol.toUpperCase()));
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }

  const user = await getOrCreateUser(userId);
  const portfolioData = await buildPortfolioResponse(userId);
  const price = parseFloat(stock.currentPrice);
  const total = shares * price;
  const tradePercent = portfolioData.totalValue > 0 ? (total / portfolioData.totalValue) * 100 : 0;

  if (type === "buy" && total > portfolioData.cashBalance) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }
  if (type === "sell") {
    const holding = portfolioData.holdings.find((h) => h.symbol === symbol.toUpperCase());
    if (!holding || holding.shares < shares) {
      res.status(400).json({ error: "Insufficient shares to sell" });
      return;
    }
  }

  const review = await getTradePreview({
    coachId: user.selectedCoachId,
    symbol: symbol.toUpperCase(),
    type,
    shares,
    price,
    total,
    tradePercent,
    cashBalance: portfolioData.cashBalance,
    portfolioValue: portfolioData.totalValue,
  });

  res.json(
    PreviewOrderResponse.parse({
      ...review,
      estimatedTotal: total,
      tradePercentOfPortfolio: tradePercent,
    }),
  );
});

router.post("/trading/orders", async (req, res): Promise<void> => {
  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = 1;
  const { symbol, type, shares, notes, confirmed } = parsed.data as {
    symbol: string;
    type: "buy" | "sell";
    shares: number;
    notes?: string;
    confirmed?: boolean;
  };

  const [stock] = await db.select().from(stocksTable).where(eq(stocksTable.symbol, symbol.toUpperCase()));
  if (!stock) {
    res.status(404).json({ error: "Stock not found" });
    return;
  }

  const user = await getOrCreateUser(userId);
  const currentPrice = parseFloat(stock.currentPrice);
  const total = shares * currentPrice;
  const portfolio = await getOrCreatePortfolio(userId);
  const cashBalance = parseFloat(portfolio.cashBalance);
  const portfolioDataBefore = await buildPortfolioResponse(userId);
  const tradePercent = portfolioDataBefore.totalValue > 0 ? (total / portfolioDataBefore.totalValue) * 100 : 0;

  // High-risk without confirmation → soft gate (coach never hard-blocks after confirm)
  if (!confirmed && tradePercent > 25) {
    const preview = await getTradePreview({
      coachId: user.selectedCoachId,
      symbol: symbol.toUpperCase(),
      type,
      shares,
      price: currentPrice,
      total,
      tradePercent,
      cashBalance,
      portfolioValue: portfolioDataBefore.totalValue,
    });
    if (preview.requiresConfirm) {
      res.status(409).json({
        error: "confirmation_required",
        preview: {
          ...preview,
          estimatedTotal: total,
          tradePercentOfPortfolio: tradePercent,
        },
      });
      return;
    }
  }

  let gainLoss: number | null = null;

  if (type === "buy") {
    if (total > cashBalance) {
      res.status(400).json({ error: "Insufficient funds" });
      return;
    }
    const newBalance = cashBalance - total;
    await db.update(portfoliosTable).set({ cashBalance: newBalance.toFixed(2) }).where(eq(portfoliosTable.id, portfolio.id));

    const [existing] = await db
      .select()
      .from(holdingsTable)
      .where(and(eq(holdingsTable.portfolioId, portfolio.id), eq(holdingsTable.symbol, symbol.toUpperCase())));
    if (existing) {
      const existingShares = parseFloat(existing.shares);
      const existingAvg = parseFloat(existing.avgCost);
      const newShares = existingShares + shares;
      const newAvg = (existingShares * existingAvg + shares * currentPrice) / newShares;
      await db
        .update(holdingsTable)
        .set({ shares: newShares.toFixed(4), avgCost: newAvg.toFixed(2) })
        .where(eq(holdingsTable.id, existing.id));
    } else {
      await db.insert(holdingsTable).values({
        portfolioId: portfolio.id,
        userId,
        symbol: symbol.toUpperCase(),
        shares: shares.toFixed(4),
        avgCost: currentPrice.toFixed(2),
      });
    }
  } else {
    const [holding] = await db
      .select()
      .from(holdingsTable)
      .where(and(eq(holdingsTable.portfolioId, portfolio.id), eq(holdingsTable.symbol, symbol.toUpperCase())));
    if (!holding || parseFloat(holding.shares) < shares) {
      res.status(400).json({ error: "Insufficient shares to sell" });
      return;
    }
    gainLoss = (currentPrice - parseFloat(holding.avgCost)) * shares;
    const newCash = cashBalance + total;
    await db.update(portfoliosTable).set({ cashBalance: newCash.toFixed(2) }).where(eq(portfoliosTable.id, portfolio.id));
    const newShares = parseFloat(holding.shares) - shares;
    if (newShares <= 0.001) {
      await db.delete(holdingsTable).where(eq(holdingsTable.id, holding.id));
    } else {
      await db.update(holdingsTable).set({ shares: newShares.toFixed(4) }).where(eq(holdingsTable.id, holding.id));
    }
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId,
      symbol: symbol.toUpperCase(),
      orderType: type,
      shares: shares.toFixed(4),
      price: currentPrice.toFixed(2),
      total: total.toFixed(2),
      notes: notes ?? null,
    })
    .returning();

  await db.insert(activityLogTable).values({
    userId,
    activityType: "trade_executed",
    title: `${type === "buy" ? "اشترى" : "باع"} ${symbol.toUpperCase()}`,
    description: `${shares} سهم @ ${currentPrice.toFixed(2)}`,
    xpGained: 15,
    icon: "trending-up",
  });

  const [currentUser] = await db.select({ xp: usersTable.xp }).from(usersTable).where(eq(usersTable.id, userId));
  await db
    .update(usersTable)
    .set({ xp: (currentUser?.xp ?? 0) + 15 })
    .where(eq(usersTable.id, userId));

  const commentary = await getPostTradeCommentary({
    coachId: user.selectedCoachId,
    symbol: symbol.toUpperCase(),
    type,
    shares,
    price: currentPrice,
    total,
    tradePercent,
    gainLoss,
  });

  const portfolioData = await buildPortfolioResponse(userId);

  res.status(201).json(
    PlaceOrderResponse.parse({
      order: {
        id: order.id,
        symbol: order.symbol,
        type: order.orderType,
        shares: parseFloat(order.shares),
        price: parseFloat(order.price),
        total: parseFloat(order.total),
        notes: order.notes ?? null,
        executedAt: order.executedAt.toISOString(),
      },
      portfolio: portfolioData,
      coachFeedback: commentary.coachFeedback,
      riskLevel: commentary.riskLevel,
      warning: commentary.warning,
      xpGained: 15,
    }),
  );
});

router.post("/trading/coach/advice", async (req, res): Promise<void> => {
  const parsed = GetCoachAdviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await getOrCreateUser(1);
  const portfolioSummary = await buildPortfolioResponse(1);
  const recentOrders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, 1))
    .orderBy(desc(ordersTable.executedAt))
    .limit(5);

  const coachId = (parsed.data as { coachId?: string }).coachId ?? user.selectedCoachId;
  const history = (parsed.data as { history?: { role: "user" | "assistant"; content: string }[] }).history;

  const advice = await getCoachAdvice({
    question: parsed.data.question,
    history,
    coachId,
    portfolioSummary,
    recentOrders: recentOrders.map((o) => ({
      symbol: o.symbol,
      type: o.orderType,
      shares: o.shares,
      price: o.price,
      executedAt: o.executedAt.toISOString(),
    })),
  });

  res.json(GetCoachAdviceResponse.parse(advice));
});

router.post("/trading/sessions/review", async (req, res): Promise<void> => {
  const parsed = ReviewTradingSessionBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await getOrCreateUser(1);
  const limit = (parsed.data as { limit?: number }).limit ?? 20;
  const coachId = (parsed.data as { coachId?: string }).coachId ?? user.selectedCoachId;
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, 1))
    .orderBy(desc(ordersTable.executedAt))
    .limit(limit);
  const portfolioSummary = await buildPortfolioResponse(1);

  const review = await getSessionReview({
    coachId,
    orders: orders.map((o) => ({
      symbol: o.symbol,
      type: o.orderType,
      shares: parseFloat(o.shares),
      price: parseFloat(o.price),
      total: parseFloat(o.total),
      executedAt: o.executedAt.toISOString(),
    })),
    portfolioSummary,
  });

  res.json(ReviewTradingSessionResponse.parse(review));
});

router.get("/trading/alerts", async (_req, res): Promise<void> => {
  const alerts = await db
    .select()
    .from(tradingAlertsTable)
    .where(eq(tradingAlertsTable.userId, 1))
    .orderBy(desc(tradingAlertsTable.createdAt))
    .limit(20);
  const result = alerts.map((a) => ({
    id: a.id,
    type: a.alertType,
    symbol: a.symbol ?? null,
    message: a.message,
    severity: a.severity,
    read: a.read === 1,
    createdAt: a.createdAt.toISOString(),
  }));
  res.json(GetTradingAlertsResponse.parse(result));
});

router.get("/trading/insights", async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, 1));
  const totalTrades = orders.length;
  const holdings = await db.select().from(holdingsTable).where(eq(holdingsTable.userId, 1));
  const profitableHoldings = await Promise.all(
    holdings.map(async (h) => {
      const [stock] = await db.select().from(stocksTable).where(eq(stocksTable.symbol, h.symbol));
      if (!stock) return false;
      return parseFloat(stock.currentPrice) > parseFloat(h.avgCost);
    }),
  );
  const winRate = holdings.length > 0 ? (profitableHoldings.filter(Boolean).length / holdings.length) * 100 : 50;

  res.json(
    GetTradingInsightsResponse.parse({
      totalTrades,
      winRate: Math.round(winRate),
      avgGainLoss: 0,
      bestTrade: totalTrades > 0 ? orders[0]?.symbol ?? null : null,
      worstTrade: null,
      topSector: "Technology",
      behaviorTips: [
        "راجع قراراتك مع مدربك بعد كل جلسة تداول.",
        "أفضل الصفقات غالباً تكون بحجم منضبط وفرضية واضحة.",
        "نوّع عبر القطاعات لتقليل تركز المخاطر.",
      ],
    }),
  );
});

export default router;
