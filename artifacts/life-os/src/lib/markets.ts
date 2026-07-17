/** Market regions for paper-trading universe (UI filter + search). */
export type MarketId = "global" | "saudi" | "arabic" | "europe";

export const MARKETS: {
  id: MarketId | "all";
  label: string;
  searchTerms: string[];
}[] = [
  { id: "all", label: "الكل", searchTerms: [] },
  { id: "global", label: "عالمي", searchTerms: ["عالمي", "global", "us", "usa", "أمريكي", "امريكي", "nasdaq", "nyse"] },
  { id: "saudi", label: "سعودي", searchTerms: ["سعودي", "السعودية", "saudi", "tasi", "تداول", "tadawul"] },
  { id: "arabic", label: "عربي", searchTerms: ["عربي", "عربية", "خليج", "امارات", "الإمارات", "مصر", "arabic", "uae", "egypt", "dfm", "adx"] },
  { id: "europe", label: "أوروبي", searchTerms: ["أوروبي", "اوروبي", "europe", "european", "eu"] },
];

/** Default market when a symbol is not listed (US/global). */
export const STOCK_MARKET: Record<string, MarketId> = {
  // Global / US
  NVDA: "global",
  AAPL: "global",
  MSFT: "global",
  TSLA: "global",
  AMZN: "global",
  GOOGL: "global",
  META: "global",
  JPM: "global",
  NFLX: "global",
  DIS: "global",
  // Saudi (Tadawul)
  "2222": "saudi",
  "1120": "saudi",
  "2010": "saudi",
  "1180": "saudi",
  "7010": "saudi",
  // Arabic / MENA
  FAB: "arabic",
  EMAAR: "arabic",
  ADNOC: "arabic",
  COMI: "arabic",
  QNBK: "arabic",
  // Europe
  SAP: "europe",
  NESN: "europe",
  ASML: "europe",
};

export function getStockMarket(symbol: string): MarketId {
  return STOCK_MARKET[symbol.toUpperCase()] ?? "global";
}

export function marketLabel(id: MarketId): string {
  return MARKETS.find((m) => m.id === id)?.label ?? "عالمي";
}
