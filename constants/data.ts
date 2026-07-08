/**
 * SmartSignals — Centralised mock data
 * All screens pull from here so content is consistent and easy to iterate.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLES / REPORTS
// ─────────────────────────────────────────────────────────────────────────────
export interface Article {
  id: string;
  type: "article" | "video" | "live";
  readTime: number;
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  body?: string;
  bodyAr?: string;
  bodyFormat?: "rich" | "plain";
  author: string[];
  /** Arabic byline; falls back to `author` when not provided by the admin. */
  authorAr?: string[];
  authorRole?: string;
  authorRoleAr?: string;
  date: string;
  tag?: string;
  ticker?: string;
  coverImage?: string;
  section: "fundamental" | "technical" | "insights" | "macro" | "live";
  market?: "egypt" | "saudi" | "usa" | "both";
  // Interactive chart (Technical Reports only) — analyst-drawn TradingView chart
  // captured to `chartImage`, with symbol/interval/indicators for the live chart.
  chartTimeframe?: string;
  chartImage?: string;
  chartCaption?: string;
  chartProvider?: string;
  chartSymbol?: string;
  chartInterval?: string;
  chartStudies?: string;
  // Mubasher legal disclaimer (تنويه) — Fundamental Reports only; rich HTML EN/AR.
  disclaimer?: string;
  disclaimerAr?: string;
}

export const ARTICLES: Article[] = [
  {
    id: "a1", type: "article", readTime: 15, section: "fundamental",
    title: "BUY TAQA: The one-stop energy shop",
    titleAr: "اشترِ TAQA: متجر الطاقة الشامل",
    subtitle: "The stability of a utility blended with an ambitious expansion story.",
    subtitleAr: "استقرار المرفق العام مع قصة توسع طموحة.",
    body: "TAQA Arabia stands at the intersection of two powerful trends: the reliability of Egypt's regulated utility sector and a bold capital-light expansion model. With a diversified revenue stream spanning gas distribution, electricity, and water, the company has quietly built one of the most resilient business models on the EGX.\n\nOur target price of EGP 21.50 implies ~51% upside from current levels. The valuation is supported by a 12x forward P/E on FY26E earnings of EGP 1.79/share — a meaningful discount to regional peers trading at 15–18x.\n\nKey catalysts: (1) FY26 capacity expansion in the industrial corridors; (2) gas price revision expected H2-26; (3) dividend yield of 4.2% providing a floor. We rate TAQA as INVEST.",
    author: ["Shahd Raafat"], authorRole: "Senior Analyst – Energy", date: "21 May 26",
    tag: "Invest", ticker: "TAQA",
  },
  {
    id: "a2", type: "article", readTime: 3, section: "fundamental",
    title: "RMDA Q1-26: Top line momentum drives margin growth",
    titleAr: "RMDA Q1-26: زخم الإيرادات يدفع نمو الهامش",
    subtitle: "Strong operating performance, net margin narrows on lower finance income.",
    subtitleAr: "أداء تشغيلي قوي؛ هامش صافٍ يتراجع بسبب انخفاض الدخل المالي.",
    body: "Rameda reported Q1-26 revenue of EGP 1.24bn, up 38% YoY, driven by strong generic drug volume growth and expanding export orders. EBITDA margin widened to 22.4% from 19.1% in Q1-25.\n\nHowever, net margin contracted to 14.2% from 17.8% due to a significant drop in finance income as the company deployed its cash into capacity expansion. We view this as a one-time headwind.\n\nOur TP remains EGP 9.50. Reiterate HOLD pending management guidance on the new Beni Suef facility ramp-up scheduled for Q3-26.",
    author: ["Ahmed Abdelnaby"], authorRole: "Analyst – Healthcare", date: "20 May 26",
    ticker: "RMDA",
  },
  {
    id: "a3", type: "article", readTime: 12, section: "fundamental",
    title: "BUY EFIH: Egypt's digital backbone",
    titleAr: "اشترِ EFIH: العمود الفقري الرقمي لمصر",
    subtitle: "Trading at its USD-based IPO price, has more room to grow.",
    subtitleAr: "يتداول عند سعر إدراجه بالدولار مع مساحة كبيرة للنمو.",
    body: "E-Finance for Digital and Financial Investments (EFIH) is the infrastructure layer underpinning Egypt's digital transformation. The company processes over 2.5 billion government transactions annually and is uniquely positioned as the sole provider of the national payments gateway.\n\nWith the government's commitment to expand digital services to 95% of civil transactions by FY28, EFIH faces a near-guaranteed demand runway. Our DCF-based TP of EGP 22.50 implies 37% upside. Initiate with INVEST.",
    author: ["Salma Osama"], authorRole: "Senior Analyst – Financials", date: "20 May 26",
    tag: "Invest", ticker: "EFIH",
  },
  {
    id: "a4", type: "video", readTime: 86, section: "live",
    title: "Nashy's Weekly Live Stream 20-5-2026",
    titleAr: "البث المباشر الأسبوعي لناشي 20-5-2026",
    subtitle: "Weekly live stream to evaluate the EGX market.",
    subtitleAr: "بث مباشر أسبوعي لتقييم سوق EGX.",
    author: ["Rowan"], authorRole: "Chief Technical Analyst", date: "20 May 26",
  },
  {
    id: "a5", type: "article", readTime: 5, section: "fundamental",
    title: "PHAR Q1-26: Growth slowed; TP trimmed",
    titleAr: "PHAR Q1-26: تباطؤ النمو وتعديل السعر المستهدف",
    subtitle: "Earnings growth is slowing down more than expected.",
    subtitleAr: "نمو الأرباح يتراجع أكثر من المتوقع.",
    body: "Egyptian International Pharmaceuticals reported weaker-than-expected Q1-26 results with net profit of EGP 128mn, missing our estimate by 12%. Revenue grew 22% YoY but margins compressed on rising raw material costs and a competitive domestic pricing environment.\n\nWe trim our TP from EGP 11.50 to EGP 10.20 and downgrade from Invest to HOLD. The company remains fundamentally sound but near-term earnings momentum has stalled.",
    author: ["Ahmed Abdelnaby"], authorRole: "Analyst – Healthcare", date: "19 May 26",
    tag: "Hold", ticker: "PHAR",
  },
  {
    id: "a6", type: "article", readTime: 8, section: "fundamental",
    title: "BUY RAYA: Egypt's most diversified growth engine",
    titleAr: "اشترِ RAYA: محرك النمو الأكثر تنوعاً في مصر",
    subtitle: "Raya Holding offers exposure to three high-growth verticals in one stock.",
    subtitleAr: "Raya Holding يتيح التعرض لثلاثة قطاعات نمو عالية في سهم واحد.",
    body: "Raya Holding's FY25 results confirmed our thesis: the company's three-segment model (IT Distribution, Outsourcing, and Retail) provides rare diversification in the Egyptian market. While IT distribution faces margin pressure, the BPO segment posted 42% revenue growth and the retail segment (Contact Centers) secured two major government contracts.\n\nWe reiterate INVEST with a TP of EGP 8.20, implying 52% upside. The stock has underperformed the EGX30 YTD by 14%, creating an attractive entry point.",
    author: ["Ahmed Abdelnaby"], authorRole: "Analyst – Technology", date: "17 May 26",
    tag: "Invest", ticker: "RAYA",
  },
  {
    id: "a7", type: "article", readTime: 6, section: "macro",
    title: "CBE revises expected growth & inflation; US inflation rises",
    titleAr: "البنك المركزي يعدّل توقعات النمو والتضخم",
    subtitle: "Central Bank revises up GDP forecast to 5.2%; inflation path remains a wildcard.",
    subtitleAr: "يرفع توقعات نمو الناتج المحلي إلى 5.2%؛ مسار التضخم لا يزال مجهولاً.",
    body: "The Central Bank of Egypt's May 2026 monetary policy review surprised markets with an upward revision to Egypt's FY26 GDP growth forecast from 4.7% to 5.2%, citing stronger-than-expected tourism receipts and resilient manufacturing PMI.\n\nHowever, the MPC kept rates unchanged at 27.25%/28.25%, signaling caution around the stubbornly high headline CPI of 23.4% (April 2026). We expect the first rate cut in Q3-26 at the earliest.",
    author: ["Shahd Raafat"], authorRole: "Macro Analyst", date: "17 May 26",
  },
  {
    id: "a8", type: "article", readTime: 4, section: "insights",
    title: "VLMRA Q1-26: Carried by the energy segment",
    titleAr: "VLMRA Q1-26: مدعوم بقطاع الطاقة",
    subtitle: "Strong Q1 driven by fossil fuel energy margins; renewables still a drag.",
    subtitleAr: "ربع قوي مدفوع بهوامش الطاقة التقليدية؛ الطاقة المتجددة لا تزال عبئاً.",
    body: "Valmore Holding Q1-26 delivered EGP 312mn in EBITDA, beating our estimate by 8%. The energy segment alone contributed 71% of EBITDA, while the renewables arm posted another loss quarter due to grid connection delays.\n\nWe maintain INVEST with TP of EGP 4.80. The anticipated renewable capacity addition in H2-26 remains the key re-rating catalyst.",
    author: ["Salma Osama"], authorRole: "Analyst – Energy", date: "17 May 26",
    ticker: "VLMRA",
  },
  {
    id: "a9", type: "video", readTime: 11, section: "insights",
    title: "EGX70 catching up, all-time highs for Smart Signals' Egypt portfolios",
    titleAr: "EGX70 يلحق بالركب ومحافظ Smart Signals تسجل مستويات قياسية",
    subtitle: "Weekly market watch — all portfolios at record highs.",
    subtitleAr: "مراقبة السوق الأسبوعية — جميع المحافظ عند مستويات قياسية.",
    author: ["Ahmed Abdelnaby"], authorRole: "Chief Investment Officer", date: "16 May 26",
  },
  {
    id: "t1", type: "video", readTime: 4, section: "technical",
    title: "EGX Weekly Watchlist – Tarek Rehan – 17 May 2026",
    titleAr: "قائمة المراقبة الأسبوعية EGX – طارق ريحان – 17 مايو 2026",
    subtitle: "This week's top chart setups: SUGR breakout, EGCH resistance test.",
    subtitleAr: "أبرز أنماط الرسوم البيانية هذا الأسبوع: اختراق SUGR، اختبار مقاومة EGCH.",
    body: "In this week's technical watchlist, Tarek covers: (1) SUGR — clean ascending triangle on the daily, watching for a breakout above EGP 50; (2) EGCH — approaching key resistance at 14.50, consider partial take-profit; (3) EHDR — inverse head-and-shoulders forming, entry zone EGP 2.3–2.37.",
    author: ["Ayman Alshahid"], authorRole: "Senior Technical Analyst", date: "17 May 26",
  },
  {
    id: "t2", type: "video", readTime: 20, section: "technical",
    title: "EGX Weekly Watchlist Ahmed Nashy 17 May 2026",
    titleAr: "قائمة المراقبة الأسبوعية EGX – أحمد ناشي – 17 مايو 2026",
    subtitle: "Market breadth improving; small-caps leading the rally.",
    subtitleAr: "تحسّن اتساع السوق؛ الأسهم الصغيرة تقود الارتفاع.",
    body: "Nashy's comprehensive technical review covers EGX50 market breadth analysis, noting that 73% of stocks are now trading above their 50-day moving averages — a bullish structural signal. Key picks: MPCO and BINV showing early momentum signatures.",
    author: ["Rowan"], authorRole: "Chief Technical Analyst", date: "16 May 26",
  },
  {
    id: "t3", type: "video", readTime: 6, section: "technical",
    title: "EGX Weekly Watchlist – Tarek Rehan – 10 May 2026",
    titleAr: "قائمة المراقبة الأسبوعية EGX – طارق ريحان – 10 مايو 2026",
    subtitle: "FWRY target price update; MPRC holding pattern analysis.",
    subtitleAr: "تحديث السعر المستهدف لـ FWRY؛ تحليل نمط تماسك MPRC.",
    body: "Tarek reviews the FWRY position after reaching 90% of our initial target. New target set at EGP 23.50 with a trailing stop at EGP 18.50. Also covers MPRC which has formed a tight consolidation box — a resolution above EGP 32 would signal continuation.",
    author: ["Ayman Alshahid"], authorRole: "Senior Technical Analyst", date: "11 May 26",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FUNDAMENTAL CALLS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * A timestamped analyst UPDATE appended to a published call (append-only; never
 * replaces the thesis/notes). Mirrors web/lib/types.ts CallUpdate. Persisted on
 * the call row as a JSON-string `updates` column; parsed client-side.
 */
export interface CallUpdate {
  id: string;
  createdAt: string;     // ISO — immutable reverse-chron sort key
  editedAt?: string;
  date: string;          // human display, e.g. "25 MAY 26"
  dateAr?: string;
  title: string;
  titleAr?: string;
  body?: string;         // rich HTML when bodyFormat==="rich"
  bodyAr?: string;
  bodyFormat?: "rich" | "plain";
  // Optional call-state changes captured with this update (#3/#5) — shown as chips.
  targetPrice?: number;
  signal?: string;
  status?: "active" | "closed";
  // Full price-targets snapshot captured with the update (#3). All optional.
  currentPrice?: number;
  remaining?: number;
  performance?: number;
  egx30?: number;
  articleId?: string;
  deleted?: boolean;     // soft delete — hidden from UI
}

export interface FundamentalCall {
  ticker: string;
  company: string;
  signal: string;
  analyst: string;
  initiatedDate: string;
  updatedDate?: string;  // auto-stamped from the newest update
  updates?: string;      // JSON-encoded CallUpdate[]
  targetPrice: number;
  currentPrice: number;
  remaining: number;
  performance: number;
  egx30: number;
  sector: string;
  thesis?: string;
  articleId?: string;
  // Mubasher legal disclaimer (تنويه) — rich HTML EN/AR; collapsible on the stock page.
  disclaimer?: string;
  disclaimerAr?: string;
}

export const FUNDAMENTAL_CALLS: FundamentalCall[] = [
  { ticker: "TAQA", company: "TAQA Arabia", signal: "Invest", analyst: "Shahd Raafat", initiatedDate: "21 May 26", targetPrice: 21.50, currentPrice: 14.23, remaining: 51.65, performance: 0.99, egx30: 0.09, sector: "Energy", thesis: "Utility + expansion growth hybrid. 51% upside to TP 21.50.", articleId: "a1" },
  { ticker: "EFIH", company: "E-Finance For Digital Investments", signal: "Invest", analyst: "Salma Osama", initiatedDate: "20 May 26", targetPrice: 22.50, currentPrice: 16.42, remaining: 36.82, performance: 1.38, egx30: -1.03, sector: "Technology", thesis: "Digital infrastructure monopoly; 37% upside to TP 22.50.", articleId: "a3" },
  { ticker: "PHAR", company: "Egyptian Intl Pharmaceuticals", signal: "Hold", analyst: "Ahmed Abdelnaby", initiatedDate: "19 May 26", targetPrice: 10.20, currentPrice: 9.02, remaining: 13.09, performance: 77.45, egx30: 61.58, sector: "Healthcare", thesis: "Slowing growth; TP trimmed to 10.20. Monitor for margin recovery.", articleId: "a5" },
  { ticker: "VLMRA", company: "Valmore Holding", signal: "Invest", analyst: "Salma Osama, Ahmed Abdelnaby", initiatedDate: "17 May 26", targetPrice: 4.80, currentPrice: 3.42, remaining: 40.51, performance: 14.55, egx30: 76.11, sector: "Energy", thesis: "Renewables capacity addition H2-26 is re-rating catalyst.", articleId: "a8" },
  { ticker: "ISPH", company: "Ibnsina Pharma", signal: "Invest", analyst: "Salma Osama", initiatedDate: "17 May 26", targetPrice: 38.50, currentPrice: 22.58, remaining: 70.54, performance: 13.98, egx30: 16.65, sector: "Healthcare", thesis: "Distribution network expansion + market share gains." },
  { ticker: "RAYA", company: "Raya Holding", signal: "Invest", analyst: "Ahmed Abdelnaby", initiatedDate: "17 May 26", targetPrice: 8.20, currentPrice: 5.40, remaining: 51.90, performance: -6.45, egx30: -1.94, sector: "Technology", thesis: "BPO segment turnaround; retail arm with government contracts.", articleId: "a6" },
  { ticker: "ORHD", company: "Orascom Development Egypt", signal: "Invest", analyst: "Salma Osama, Ahmed Abdelnaby", initiatedDate: "14 May 26", targetPrice: 15.80, currentPrice: 13.41, remaining: 17.78, performance: 222.79, egx30: 79.46, sector: "Real Estate", thesis: "El Gouna asset NAV discount continues to close." },
  { ticker: "ORAS", company: "Orascom Construction", signal: "Invest", analyst: "Shahd Raafat", initiatedDate: "12 May 26", targetPrice: 58.00, currentPrice: 46.70, remaining: 24.20, performance: 8.22, egx30: 5.11, sector: "Construction", thesis: "Backlog at record highs; US operations value under-appreciated." },
];

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICAL CALLS
// ─────────────────────────────────────────────────────────────────────────────
export interface TechnicalCall {
  ticker: string;
  company: string;
  signal: string;
  analyst: string;
  date: string;
  updatedDate?: string;  // auto-stamped from the newest update
  updates?: string;      // JSON-encoded CallUpdate[]
  entryMin: number;
  entryMax: number;
  targetPrice: number;
  stopLoss: number;
  currentPrice: number;
  return: number;
  pattern: string;
  timeframe: string;
  notes?: string;
  notesAr?: string;
  companyAr?: string;
  chartImage?: string;
  chartCaption?: string;
  // Interactive chart (TradingView) — mirrors web for the in-app live-chart WebView.
  chartProvider?: string;
  chartSymbol?: string;
  chartInterval?: string;
  chartStudies?: string;   // JSON string[] of TV study ids
  chartLayout?: string;
  status?: string;
  closedDate?: string;
  closedPrice?: number;
  realizedReturn?: number;
  tp2?: number;
  tp3?: number;
  conservativeSL?: number;
  aggressiveSL?: number;
  trailingStopPct?: number;
  trend?: "uptrend" | "downtrend" | "sideways";
  // Mubasher legal disclaimer (تنويه) — rich HTML EN/AR; collapsible on the stock page.
  disclaimer?: string;
  disclaimerAr?: string;
}

// Editorial chart-led write-up (admin "Technical Articles" type). Distinct from a
// TechnicalCall: no entry/target/stop — a chart + three bilingual rich blocks. Shown
// on the Technical tab under Technical Reports and opened via /technical-article/[id].
export interface TechnicalArticle {
  id: string;
  ticker: string;
  company?: string;
  companyAr?: string;
  market?: "egypt" | "saudi" | "usa" | "both" | "commodities";
  analyst?: string;
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  chartTimeframe?: string;
  chartImage?: string;
  chartCaption?: string;
  technicalBody?: string;
  technicalBodyAr?: string;
  priceSummary?: string;
  priceSummaryAr?: string;
  disclaimer?: string;
  disclaimerAr?: string;
  date?: string;
  trend?: "uptrend" | "downtrend" | "sideways";
  published?: boolean;
}

// Fundamental Articles — analyst research prose (company deep-dives, earnings,
// valuation) authored in the admin "Fundamental Articles" tab. No chart/price
// metadata — just body + the Mubasher legal disclaimer (dynamic analyst name/title).
export interface FundamentalArticle {
  id: string;
  ticker: string;
  tickers?: string[];
  company?: string;
  companyAr?: string;
  market?: "egypt" | "saudi" | "usa" | "both" | "commodities";
  analyst?: string;
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  body?: string;
  bodyAr?: string;
  disclaimer?: string;
  disclaimerAr?: string;
  date?: string;
  published?: boolean;
}

export const TECHNICAL_CALLS: TechnicalCall[] = [
  { ticker: "SUGR", company: "Delta Sugar", signal: "Buy", analyst: "Ayman Alshahid", date: "17 May 26", entryMin: 49.00, entryMax: 50.50, targetPrice: 73.50, stopLoss: 44.50, currentPrice: 48.78, return: 50.68, pattern: "Ascending Triangle", timeframe: "Daily", notes: "Breakout above EGP 50 confirms pattern. Volume expansion needed." },
  { ticker: "EGCH", company: "Egyptian Chemical Industries", signal: "Take Profit", analyst: "Ayman Alshahid", date: "14 May 26", entryMin: 9.20, entryMax: 9.80, targetPrice: 16.00, stopLoss: 8.50, currentPrice: 13.92, return: 12.35, pattern: "Channel Breakout", timeframe: "Weekly", notes: "Approaching resistance at 14.50. Take 25% profit here." },
  { ticker: "EHDR", company: "Egyptians Housing Dev. & Reconstruction", signal: "Buy", analyst: "Ayman Alshahid", date: "13 May 26", entryMin: 2.30, entryMax: 2.37, targetPrice: 3.20, stopLoss: 2.10, currentPrice: 2.26, return: 41.59, pattern: "Inv. Head & Shoulders", timeframe: "Daily", notes: "Right shoulder forming. Entry on confirmation above neckline." },
  { ticker: "MPCO", company: "Mansourah Poultry", signal: "Buy", analyst: "Ayman Alshahid", date: "13 May 26", entryMin: 1.70, entryMax: 1.75, targetPrice: 2.80, stopLoss: 1.55, currentPrice: 1.56, return: 79.49, pattern: "Double Bottom", timeframe: "Weekly", notes: "Momentum RSI divergence with price. Strong accumulation phase." },
  { ticker: "MPRC", company: "Egyptian Media Production City", signal: "Hold", analyst: "Ayman Alshahid", date: "12 May 26", entryMin: 26.00, entryMax: 27.50, targetPrice: 40.00, stopLoss: 24.00, currentPrice: 31.00, return: 2.65, pattern: "Tight Consolidation", timeframe: "Daily", notes: "Consolidating below 32 resistance. Breakout above 32 is bullish trigger." },
  { ticker: "BINV", company: "B Investments Holding", signal: "Hold", analyst: "Rowan", date: "10 May 26", entryMin: 38.00, entryMax: 39.50, targetPrice: 50.00, stopLoss: 35.50, currentPrice: 41.46, return: 4.62, pattern: "Flag Consolidation", timeframe: "Weekly", notes: "Tight flag after strong rally. Hold with stop at 35.50." },
  { ticker: "FWRY", company: "Fawry For Banking Technology", signal: "Take Profit", analyst: "Rowan", date: "10 May 26", entryMin: 13.50, entryMax: 14.20, targetPrice: 23.50, stopLoss: 12.80, currentPrice: 19.54, return: 8.68, pattern: "Bull Flag Breakout", timeframe: "Daily", notes: "TP revised up to 23.50. Trailing stop now at 18.50." },
  { ticker: "BONY", company: "Banque du Caire", signal: "Sell", analyst: "Ayman Alshahid", date: "08 May 26", entryMin: 6.20, entryMax: 6.50, targetPrice: 4.20, stopLoss: 7.00, currentPrice: 4.85, return: -22.40, pattern: "Head & Shoulders Top", timeframe: "Daily", notes: "Pattern completed. Exit position, target met." },
];

// ─────────────────────────────────────────────────────────────────────────────
// NEWS
// ─────────────────────────────────────────────────────────────────────────────
export const NEWS = [
  { id: "n1", title: "EFG Holding profit slips despite revenue growth",                   titleAr: "أرباح EFG Holding تتراجع رغم نمو الإيرادات",                          date: "21 May 26", category: "Earnings" },
  { id: "n2", title: "Egyptalum denies awarding foil project to German company",          titleAr: "إيجيبتالوم تنفي منح مشروع الرقائق لشركة ألمانية",                    date: "21 May 26", category: "Corporate" },
  { id: "n3", title: "CBE keeps rates unchanged at 27.25%; flags H2-26 cut window",      titleAr: "البنك المركزي يُبقي على الأسعار عند 27.25%؛ يُلمح لفرصة خفض في H2", date: "21 May 26", category: "Macro" },
  { id: "n4", title: "Rameda bottom line up on strong sales, export growth",              titleAr: "أرباح راميدا الصافية ترتفع مدعومةً بنمو المبيعات والصادرات",           date: "20 May 26", category: "Earnings" },
  { id: "n5", title: "COPAD Pharma targets 20-30% IPO in secondary offering",            titleAr: "COPAD للأدوية تستهدف طرحاً عاماً بنسبة 20-30%",                       date: "20 May 26", category: "IPO" },
  { id: "n6", title: "Trump says he came close to restarting Iran strikes",               titleAr: "ترامب: كنت قريباً من استئناف الضربات على إيران",                       date: "20 May 26", category: "Global" },
  { id: "n7", title: "Egypt's March trade deficit narrows 18% on export surge",          titleAr: "العجز التجاري لمصر يتراجع 18% في مارس مع قفزة الصادرات",              date: "19 May 26", category: "Macro" },
  { id: "n8", title: "EGX30 hits record close; foreign buying dominates session",        titleAr: "EGX30 يسجل إغلاقاً قياسياً؛ المشتريات الأجنبية تهيمن على الجلسة",   date: "19 May 26", category: "Market" },
];

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIOS
// ─────────────────────────────────────────────────────────────────────────────
export const PORTFOLIOS = [
  { id: "p1", name: "Mubasher Fundamental Portfolio", shortName: "MFP", return: 92.1, egx30: 0, stocks: 8, color: "#4D8EF8", desc: "EGX-focused long-term investment portfolio based on fundamental research." },
  { id: "p2", name: "Bottom Fisher Portfolio", shortName: "BFP", return: 118.4, egx30: 0, stocks: 6, color: "#D9B560", desc: "Contrarian deep-value strategy targeting unloved EGX names." },
  { id: "p3", name: "Mubasher Shariah Portfolio", shortName: "MSP", return: 76.3, egx30: 0, stocks: 7, color: "#2DA8A8", desc: "Shariah-compliant investment portfolio screened by accredited scholars." },
];

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
export type NotifType =
  | "article" | "signal-buy" | "signal-invest" | "signal-sell"
  | "signal-hold" | "signal-take-profit" | "signal-target"
  | "live" | "portfolio" | "price-alert";

export interface Notification {
  id: string;
  date: string;
  time?: string;
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  type: NotifType;
  ticker?: string;
  price?: string;
  read?: boolean;
  articleId?: string;
}

export const NOTIFICATIONS: Notification[] = [
  {
    id: "notif1", date: "21 May 26", time: "12:30 pm",
    title: "BUY TAQA: The one-stop energy shop",
    titleAr: "اشترِ TAQA: متجر الطاقة الشامل",
    subtitle: "The stability of a utility blended with an ambitious expansion story.",
    subtitleAr: "استقرار شركة المرافق مدمج مع قصة توسع طموحة.",
    type: "article", ticker: "TAQA", read: false, articleId: "a1",
  },
  {
    id: "notif2", date: "20 May 26", time: "05:17 pm",
    title: "RMDA Q1-26: Top line momentum drives margin growth",
    titleAr: "RMDA Q1-26: زخم الإيرادات يدفع نمو الهامش",
    type: "article", ticker: "RMDA", read: false, articleId: "a2",
  },
  {
    id: "notif3", date: "20 May 26", time: "01:22 pm",
    title: "PHAR: Cut to HOLD — TP trimmed to EGP 10.20",
    titleAr: "PHAR: تخفيض إلى احتفظ — تعديل السعر المستهدف إلى 10.20 ج.م",
    subtitle: "Earnings growth slowing more than expected. Exit partially.",
    subtitleAr: "نمو الأرباح يتباطأ أكثر من المتوقع. خروج جزئي.",
    type: "signal-hold", ticker: "PHAR", read: true, articleId: "a5",
  },
  {
    id: "notif4", date: "20 May 26", time: "01:14 pm",
    title: "BUY EFIH: Egypt's digital backbone",
    titleAr: "اشترِ EFIH: العمود الفقري الرقمي لمصر",
    subtitle: "Initiate with INVEST. TP EGP 22.50.",
    subtitleAr: "بدء بتوصية استثمر. السعر المستهدف 22.50 ج.م.",
    type: "signal-invest", ticker: "EFIH", read: true, articleId: "a3",
  },
  {
    id: "notif5", date: "18 May 26",
    title: "EGX Open Bell Live 18-05-2026",
    titleAr: "بث مباشر لجرس افتتاح EGX 18-05-2026",
    type: "live", read: true,
  },
  {
    id: "notif6", date: "17 May 26", time: "09:15 am",
    title: "SELL BONY",
    titleAr: "بيع BONY",
    subtitle: "Exit your position. Current Price: EGP 4.85.",
    subtitleAr: "اخرج من مركزك. السعر الحالي: 4.85 ج.م.",
    type: "signal-sell", ticker: "BONY", read: true,
  } as any,
  {
    id: "notif7", date: "17 May 26", time: "08:45 am",
    title: "BUY SUGR",
    titleAr: "اشترِ SUGR",
    subtitle: "Buy between EGP 49 – 50.5. Target: EGP 73.50.",
    subtitleAr: "اشترِ بين 49 – 50.5 ج.م. الهدف: 73.50 ج.م.",
    type: "signal-buy", ticker: "SUGR", read: true,
  } as any,
  {
    id: "notif8", date: "17 May 26",
    title: "BUY RAYA: Egypt's most diversified growth engine",
    titleAr: "اشترِ RAYA: أكثر محركات النمو تنوعاً في مصر",
    type: "article", ticker: "RAYA", read: true, articleId: "a6",
  },
  {
    id: "notif9", date: "16 May 26",
    title: "EGX70 catching up, all-time highs for Smart Signals portfolios",
    titleAr: "EGX70 يلحق بالركب، مستويات قياسية لمحافظ Smart Signals",
    type: "article", read: true, articleId: "a9",
  },
  {
    id: "notif10", date: "14 May 26", time: "11:30 am",
    title: "TAKE PROFIT EGCH",
    titleAr: "اجنِ الأرباح EGCH",
    subtitle: "Sell 25% of position. Current Price: EGP 14.35.",
    subtitleAr: "بيع 25% من المركز. السعر الحالي: 14.35 ج.م.",
    type: "signal-take-profit", ticker: "EGCH", read: true,
  } as any,
  {
    id: "notif11", date: "14 May 26",
    title: "SELL TANM",
    titleAr: "بيع TANM",
    subtitle: "Exit full position. Current Price: EGP 5.79.",
    subtitleAr: "بيع المركز بالكامل. السعر الحالي: 5.79 ج.م.",
    type: "signal-sell", ticker: "TANM", read: true,
  } as any,
  {
    id: "notif12", date: "13 May 26",
    title: "BUY EHDR",
    titleAr: "اشترِ EHDR",
    subtitle: "Buy between EGP 2.30 – 2.37. Target: EGP 3.20.",
    subtitleAr: "اشترِ بين 2.30 – 2.37 ج.م. الهدف: 3.20 ج.م.",
    type: "signal-buy", ticker: "EHDR", read: true,
  } as any,
  {
    id: "notif13", date: "10 May 26",
    title: "Target Price Update: FWRY → EGP 23.50",
    titleAr: "تحديث السعر المستهدف: FWRY ← 23.50 ج.م",
    type: "signal-target", ticker: "FWRY", read: true,
  },
];
