import { eq } from "drizzle-orm";
import { db, stocksTable, usersTable } from "@workspace/db";

const DEFAULT_STOCKS = [
  // Global / US
  { symbol: "NVDA", name: "NVIDIA Corporation", currentPrice: "875.50", priceChange: "12.40", priceChangePercent: "1.44", sector: "Technology", marketCap: "2.15T", description: "شركة رائدة في وحدات معالجة الرسومات والذكاء الاصطناعي. سوق عالمي." },
  { symbol: "AAPL", name: "Apple Inc.", currentPrice: "198.75", priceChange: "-1.20", priceChangePercent: "-0.60", sector: "Technology", marketCap: "3.05T", description: "شركة تقنية متعددة المنتجات والخدمات. سوق عالمي." },
  { symbol: "MSFT", name: "Microsoft Corporation", currentPrice: "425.30", priceChange: "3.15", priceChangePercent: "0.75", sector: "Technology", marketCap: "3.16T", description: "برمجيات سحابية ونظم تشغيل وخدمات المؤسسات. سوق عالمي." },
  { symbol: "TSLA", name: "Tesla, Inc.", currentPrice: "248.90", priceChange: "5.60", priceChangePercent: "2.30", sector: "Consumer Cyclical", marketCap: "790B", description: "مركبات كهربائية وطاقة نظيفة. سوق عالمي." },
  { symbol: "AMZN", name: "Amazon.com, Inc.", currentPrice: "185.20", priceChange: "1.85", priceChangePercent: "1.01", sector: "Consumer Cyclical", marketCap: "1.93T", description: "تجارة إلكترونية وسحابة AWS. سوق عالمي." },
  { symbol: "GOOGL", name: "Alphabet Inc.", currentPrice: "165.40", priceChange: "-0.90", priceChangePercent: "-0.54", sector: "Communication", marketCap: "2.05T", description: "بحث وإعلان ومنصات رقمية. سوق عالمي." },
  { symbol: "META", name: "Meta Platforms, Inc.", currentPrice: "512.80", priceChange: "4.25", priceChangePercent: "0.84", sector: "Communication", marketCap: "1.30T", description: "شبكات اجتماعية وواقع افتراضي. سوق عالمي." },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", currentPrice: "198.50", priceChange: "0.75", priceChangePercent: "0.38", sector: "Financial", marketCap: "570B", description: "خدمات مصرفية واستثمارية. سوق عالمي." },
  { symbol: "NFLX", name: "Netflix, Inc.", currentPrice: "645.20", priceChange: "8.10", priceChangePercent: "1.27", sector: "Communication", marketCap: "280B", description: "منصة بث ترفيهي عالمية." },
  { symbol: "DIS", name: "The Walt Disney Company", currentPrice: "112.40", priceChange: "-0.85", priceChangePercent: "-0.75", sector: "Communication", marketCap: "205B", description: "ترفيه وإعلام وحدائق ترفيهية." },

  // Saudi / Tadawul
  { symbol: "2222", name: "أرامكو السعودية · Saudi Aramco", currentPrice: "28.15", priceChange: "0.25", priceChangePercent: "0.90", sector: "Energy", marketCap: "1.8T", description: "عملاق الطاقة السعودي — سوق تداول (سعودي)." },
  { symbol: "1120", name: "مصرف الراجحي · Al Rajhi Bank", currentPrice: "86.40", priceChange: "0.60", priceChangePercent: "0.70", sector: "Financial", marketCap: "85B", description: "أكبر بنك إسلامي في السعودية — سوق تداول." },
  { symbol: "2010", name: "سابك · SABIC", currentPrice: "74.20", priceChange: "-0.40", priceChangePercent: "-0.54", sector: "Materials", marketCap: "58B", description: "شركة الصناعات الأساسية السعودية — كيماويات." },
  { symbol: "1180", name: "البنك الأهلي · SNB", currentPrice: "38.90", priceChange: "0.15", priceChangePercent: "0.39", sector: "Financial", marketCap: "72B", description: "البنك الأهلي السعودي — خدمات مصرفية." },
  { symbol: "7010", name: "الاتصالات السعودية · stc", currentPrice: "42.55", priceChange: "0.35", priceChangePercent: "0.83", sector: "Communication", marketCap: "52B", description: "مجموعة stc — اتصالات وتقنية." },

  // Arabic / MENA
  { symbol: "FAB", name: "بنك أبوظبي الأول · FAB", currentPrice: "14.80", priceChange: "0.12", priceChangePercent: "0.82", sector: "Financial", marketCap: "48B", description: "أكبر بنك في الإمارات — سوق أبوظبي." },
  { symbol: "EMAAR", name: "إعمار العقارية · Emaar", currentPrice: "8.65", priceChange: "-0.08", priceChangePercent: "-0.92", sector: "Real Estate", marketCap: "22B", description: "تطوير عقاري إماراتي — دبي." },
  { symbol: "ADNOC", name: "أدنوك للتوزيع · ADNOC Dist.", currentPrice: "3.72", priceChange: "0.04", priceChangePercent: "1.09", sector: "Energy", marketCap: "45B", description: "توزيع وقود وتجزئة — الإمارات." },
  { symbol: "COMI", name: "البنك التجاري الدولي · CIB", currentPrice: "82.10", priceChange: "1.20", priceChangePercent: "1.48", sector: "Financial", marketCap: "12B", description: "أكبر بنك خاص في مصر — سوق عربي." },
  { symbol: "QNBK", name: "بنك قطر الوطني · QNB", currentPrice: "16.40", priceChange: "0.10", priceChangePercent: "0.61", sector: "Financial", marketCap: "55B", description: "أكبر بنك في الشرق الأوسط — قطر." },

  // Europe
  { symbol: "SAP", name: "SAP SE", currentPrice: "198.30", priceChange: "2.10", priceChangePercent: "1.07", sector: "Technology", marketCap: "240B", description: "برمجيات مؤسسات أوروبية — ألمانيا." },
  { symbol: "NESN", name: "Nestlé S.A.", currentPrice: "98.50", priceChange: "-0.45", priceChangePercent: "-0.45", sector: "Consumer Defensive", marketCap: "260B", description: "أغذية ومشروبات عالمية — سويسرا." },
  { symbol: "ASML", name: "ASML Holding", currentPrice: "920.00", priceChange: "15.50", priceChangePercent: "1.71", sector: "Technology", marketCap: "360B", description: "معدات أشباه الموصلات — هولندا." },
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
