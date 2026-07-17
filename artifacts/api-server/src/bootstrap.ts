import { eq } from "drizzle-orm";
import { db, stocksTable, usersTable } from "@workspace/db";

const DEFAULT_STOCKS = [
  { symbol: "NVDA", name: "NVIDIA Corporation", currentPrice: "875.50", priceChange: "12.40", priceChangePercent: "1.44", sector: "Technology", marketCap: "2.15T", description: "شركة رائدة في وحدات معالجة الرسومات والذكاء الاصطناعي." },
  { symbol: "AAPL", name: "Apple Inc.", currentPrice: "198.75", priceChange: "-1.20", priceChangePercent: "-0.60", sector: "Technology", marketCap: "3.05T", description: "شركة تقنية متعددة المنتجات والخدمات." },
  { symbol: "MSFT", name: "Microsoft Corporation", currentPrice: "425.30", priceChange: "3.15", priceChangePercent: "0.75", sector: "Technology", marketCap: "3.16T", description: "برمجيات سحابية ونظم تشغيل وخدمات المؤسسات." },
  { symbol: "TSLA", name: "Tesla, Inc.", currentPrice: "248.90", priceChange: "5.60", priceChangePercent: "2.30", sector: "Consumer Cyclical", marketCap: "790B", description: "مركبات كهربائية وطاقة نظيفة." },
  { symbol: "AMZN", name: "Amazon.com, Inc.", currentPrice: "185.20", priceChange: "1.85", priceChangePercent: "1.01", sector: "Consumer Cyclical", marketCap: "1.93T", description: "تجارة إلكترونية وسحابة AWS." },
  { symbol: "GOOGL", name: "Alphabet Inc.", currentPrice: "165.40", priceChange: "-0.90", priceChangePercent: "-0.54", sector: "Communication", marketCap: "2.05T", description: "بحث وإعلان ومنصات رقمية." },
  { symbol: "META", name: "Meta Platforms, Inc.", currentPrice: "512.80", priceChange: "4.25", priceChangePercent: "0.84", sector: "Communication", marketCap: "1.30T", description: "شبكات اجتماعية وواقع افتراضي." },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", currentPrice: "198.50", priceChange: "0.75", priceChangePercent: "0.38", sector: "Financial", marketCap: "570B", description: "خدمات مصرفية واستثمارية." },
];

/** Ensure demo user + stocks exist (idempotent). */
export async function bootstrapDemoData(): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, 1));
  if (!user) {
    await db.insert(usersTable).values({ id: 1, username: "Trader" });
  }

  for (const stock of DEFAULT_STOCKS) {
    const [existing] = await db.select().from(stocksTable).where(eq(stocksTable.symbol, stock.symbol));
    if (!existing) {
      await db.insert(stocksTable).values(stock);
    }
  }
}
