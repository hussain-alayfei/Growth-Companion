import { pgTable, serial, integer, text, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stocksTable = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  sector: text("sector").notNull(),
  marketCap: text("market_cap"),
  description: text("description"),
  currentPrice: numeric("current_price", { precision: 10, scale: 2 }).notNull().default("100.00"),
  priceChange: numeric("price_change", { precision: 10, scale: 2 }).notNull().default("0.00"),
  priceChangePercent: numeric("price_change_percent", { precision: 8, scale: 4 }).notNull().default("0.00"),
  aiRating: text("ai_rating"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stockPricesTable = pgTable("stock_prices", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  priceDate: date("price_date").notNull(),
  open: numeric("open", { precision: 10, scale: 2 }).notNull(),
  high: numeric("high", { precision: 10, scale: 2 }).notNull(),
  low: numeric("low", { precision: 10, scale: 2 }).notNull(),
  close: numeric("close", { precision: 10, scale: 2 }).notNull(),
  volume: integer("volume").notNull().default(1000000),
});

export const portfoliosTable = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1).unique(),
  cashBalance: numeric("cash_balance", { precision: 12, scale: 2 }).notNull().default("10000.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const holdingsTable = pgTable("holdings", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").notNull(),
  userId: integer("user_id").notNull().default(1),
  symbol: text("symbol").notNull(),
  shares: numeric("shares", { precision: 12, scale: 4 }).notNull().default("0"),
  avgCost: numeric("avg_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  symbol: text("symbol").notNull(),
  orderType: text("order_type").notNull(), // buy | sell
  shares: numeric("shares", { precision: 12, scale: 4 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export const tradingAlertsTable = pgTable("trading_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().default(1),
  alertType: text("alert_type").notNull(),
  symbol: text("symbol"),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("info"),
  read: integer("read").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockSchema = createInsertSchema(stocksTable).omit({ id: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, executedAt: true });

export type Stock = typeof stocksTable.$inferSelect;
export type StockPrice = typeof stockPricesTable.$inferSelect;
export type Portfolio = typeof portfoliosTable.$inferSelect;
export type Holding = typeof holdingsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type TradingAlert = typeof tradingAlertsTable.$inferSelect;
