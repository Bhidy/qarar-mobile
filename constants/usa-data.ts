/**
 * SmartSignals — USA (NYSE / NASDAQ) Market Data
 * Mirror of the Saudi data structure, populated with US large-caps.
 * Prices are in USD; the benchmark field is `sp500` (S&P 500) instead of `tadawul`.
 */

export interface UsaStock {
  ticker: string;
  company: string;
  companyAr: string;
  sector: string;
  sectorAr: string;
  signal: "Invest" | "Hold" | "Buy" | "Sell" | "Take Profit";
  analyst: string;
  initiatedDate: string;
  targetPrice: number;
  currentPrice: number;
  remaining: number;
  performance: number;
  sp500?: number;         // vs S&P 500 index — computed live by applyBenchmark when absent
  thesis: string;
  thesisAr: string;
}

export const USA_FUNDAMENTAL: UsaStock[] = [
  {
    ticker: "AAPL", company: "Apple Inc.", companyAr: "أبل",
    sector: "Technology", sectorAr: "التكنولوجيا",
    signal: "Invest", analyst: "Shahd Raafat", initiatedDate: "20 May 26",
    targetPrice: 285.00, currentPrice: 224.30, remaining: 27.06, performance: 9.80,     thesis: "Services flywheel and an installed base above 2.2bn devices underpin durable double-digit FCF growth. AI features drive an iPhone upgrade super-cycle. TP $285.",
    thesisAr: "محرك الخدمات وقاعدة مستخدمين تتجاوز 2.2 مليار جهاز يدعمان نمو التدفقات النقدية الحرة. ميزات الذكاء الاصطناعي تقود دورة ترقية الآيفون. الهدف 285 دولار.",
  },
  {
    ticker: "MSFT", company: "Microsoft Corp.", companyAr: "مايكروسوفت",
    sector: "Technology", sectorAr: "التكنولوجيا",
    signal: "Invest", analyst: "Ahmed Abdelnaby", initiatedDate: "18 May 26",
    targetPrice: 520.00, currentPrice: 421.60, remaining: 23.34, performance: 11.40,     thesis: "Azure + Copilot monetization compounding at 30%+. Enterprise AI leader with pricing power. Initiate INVEST at TP $520.",
    thesisAr: "نمو تسييل أزور وكوبايلوت بأكثر من 30%. رائد الذكاء الاصطناعي للمؤسسات مع قوة تسعيرية. الهدف 520 دولار.",
  },
  {
    ticker: "NVDA", company: "NVIDIA Corp.", companyAr: "إنفيديا",
    sector: "Semiconductors", sectorAr: "أشباه الموصلات",
    signal: "Buy", analyst: "Salma Osama", initiatedDate: "15 May 26",
    targetPrice: 210.00, currentPrice: 168.20, remaining: 24.85, performance: 18.60,     thesis: "Data-center GPU demand outstrips supply through 2027. Blackwell ramp + CUDA moat. Momentum and fundamentals aligned. TP $210.",
    thesisAr: "الطلب على معالجات مراكز البيانات يتجاوز العرض حتى 2027. حاجز CUDA التنافسي. الهدف 210 دولار.",
  },
  {
    ticker: "JPM", company: "JPMorgan Chase", companyAr: "جي بي مورغان تشيس",
    sector: "Banking", sectorAr: "البنوك",
    signal: "Hold", analyst: "Ahmed Abdelnaby", initiatedDate: "12 May 26",
    targetPrice: 245.00, currentPrice: 228.10, remaining: 7.41, performance: 4.20,     thesis: "Best-in-class franchise but valuation full after the run. Hold for dividend + buyback yield; await a better entry. TP $245.",
    thesisAr: "امتياز مصرفي من الطراز الأول لكن التقييم مكتمل بعد الصعود. احتفظ للعائد على التوزيعات وإعادة الشراء. الهدف 245 دولار.",
  },
  {
    ticker: "AMZN", company: "Amazon.com Inc.", companyAr: "أمازون",
    sector: "Consumer / Cloud", sectorAr: "الاستهلاك / الحوسبة السحابية",
    signal: "Invest", analyst: "Salma Osama", initiatedDate: "10 May 26",
    targetPrice: 265.00, currentPrice: 205.40, remaining: 29.02, performance: 7.90,     thesis: "AWS reaccelerating, retail margins inflecting, and advertising scaling. Operating leverage story intact. TP $265.",
    thesisAr: "تسارع نمو AWS وتحسن هوامش التجزئة وتوسع الإعلانات. قصة الرافعة التشغيلية قائمة. الهدف 265 دولار.",
  },
];

export interface UsaTechnical {
  ticker: string;
  company: string;
  signal: "Buy" | "Hold" | "Take Profit" | "Sell";
  analyst: string;
  date: string;
  entryMin: number;
  entryMax: number;
  targetPrice: number;
  stopLoss: number;
  currentPrice: number;
  return: number;
  pattern: string;
  timeframe: string;
  notes?: string;
}

export const USA_TECHNICAL: UsaTechnical[] = [
  {
    ticker: "TSLA", company: "Tesla Inc.", signal: "Buy",
    analyst: "Ayman Alshahid", date: "17 May 26",
    entryMin: 320.00, entryMax: 335.00, targetPrice: 430.00, stopLoss: 298.00,
    currentPrice: 331.40, return: 29.75, pattern: "Bull Flag Breakout",
    timeframe: "Weekly", notes: "Bull flag on the daily with rising volume into the breakout. Entry on close above 335.",
  },
  {
    ticker: "AMD", company: "Advanced Micro Devices", signal: "Buy",
    analyst: "Rowan", date: "15 May 26",
    entryMin: 158.00, entryMax: 164.00, targetPrice: 210.00, stopLoss: 146.00,
    currentPrice: 161.20, return: 30.27, pattern: "Cup and Handle",
    timeframe: "Daily", notes: "Cup and handle completing above the 200-DMA. Volume confirms the handle.",
  },
  {
    ticker: "META", company: "Meta Platforms", signal: "Take Profit",
    analyst: "Ayman Alshahid", date: "14 May 26",
    entryMin: 560.00, entryMax: 580.00, targetPrice: 720.00, stopLoss: 525.00,
    currentPrice: 688.50, return: 4.58, pattern: "Ascending Channel",
    timeframe: "Weekly", notes: "Approaching upper channel resistance — trim 30%, trail the rest.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// USA ARTICLES — Latest content for home "Latest Releases" section
// ─────────────────────────────────────────────────────────────────────────────
export const USA_ARTICLES = [
  {
    id: "ua1", type: "article" as const, readTime: 11,
    section: "fundamental" as const,
    title: "INVEST AAPL: Apple's services flywheel + AI super-cycle",
    titleAr: "استثمر AAPL: محرك خدمات أبل ودورة الذكاء الاصطناعي الفائقة",
    subtitle: "2.2bn-device base and AI features drive a durable double-digit FCF compounder. TP $285.",
    subtitleAr: "قاعدة 2.2 مليار جهاز وميزات الذكاء الاصطناعي تقود نمواً مركباً للتدفقات النقدية. الهدف 285 دولار.",
    author: ["Shahd Raafat"], date: "21 May 26", tag: "Invest", ticker: "AAPL",
  },
  {
    id: "ua2", type: "article" as const, readTime: 9,
    section: "fundamental" as const,
    title: "INVEST MSFT: Azure + Copilot monetization compounding",
    titleAr: "استثمر MSFT: نمو تسييل أزور وكوبايلوت",
    subtitle: "Enterprise AI leader with pricing power; cloud growth reaccelerating. TP $520.",
    subtitleAr: "رائد الذكاء الاصطناعي للمؤسسات مع قوة تسعيرية ونمو سحابي متسارع. الهدف 520 دولار.",
    author: ["Ahmed Abdelnaby"], date: "20 May 26", tag: "Invest", ticker: "MSFT",
  },
  {
    id: "ua3", type: "article" as const, readTime: 8,
    section: "fundamental" as const,
    title: "BUY NVDA: Data-center GPU demand outstrips supply",
    titleAr: "اشترِ NVDA: الطلب على معالجات مراكز البيانات يتجاوز العرض",
    subtitle: "Blackwell ramp and the CUDA moat keep NVIDIA in the lead through 2027. TP $210.",
    subtitleAr: "إطلاق Blackwell وحاجز CUDA يبقيان إنفيديا في الصدارة حتى 2027. الهدف 210 دولار.",
    author: ["Salma Osama"], date: "19 May 26", tag: "Buy", ticker: "NVDA",
  },
  {
    id: "ua4", type: "video" as const, readTime: 42,
    section: "live" as const,
    title: "US Markets Weekly Live — Rowan — 17 May 2026",
    titleAr: "البث المباشر الأسبوعي للأسواق الأمريكية — روان — 17 مايو 2026",
    subtitle: "Weekly S&P 500 & Nasdaq review: sector rotation, top movers, and upcoming catalysts.",
    subtitleAr: "مراجعة أسبوعية لمؤشري S&P 500 وناسداك: تدوير القطاعات وأبرز المتحركين والمحفزات القادمة.",
    author: ["Rowan"], date: "17 May 26",
  },
];

export const USA_NEWS = [
  { id: "un1", title: "Apple unveils on-device AI suite at WWDC, shares jump",         titleAr: "أبل تكشف عن مجموعة ذكاء اصطناعي على الجهاز في WWDC والسهم يقفز",        date: "21 May 26", category: "Corporate" },
  { id: "un2", title: "Fed holds rates steady, signals one cut later this year",       titleAr: "الفيدرالي يثبت أسعار الفائدة ويشير إلى خفض واحد لاحقاً هذا العام",       date: "21 May 26", category: "Macro" },
  { id: "un3", title: "S&P 500 closes at record high on cooling inflation data",       titleAr: "مؤشر S&P 500 يغلق عند مستوى قياسي بدعم بيانات التضخم المتراجعة",        date: "20 May 26", category: "Market" },
  { id: "un4", title: "Nvidia Q1 revenue tops estimates on data-center demand",        titleAr: "إيرادات إنفيديا في Q1 تتجاوز التوقعات بدعم الطلب على مراكز البيانات",    date: "20 May 26", category: "Earnings" },
  { id: "un5", title: "Microsoft expands Copilot to enterprise tiers, Azure accelerates", titleAr: "مايكروسوفت توسع كوبايلوت لباقات المؤسسات وأزور يتسارع",              date: "19 May 26", category: "Corporate" },
  { id: "un6", title: "US GDP grows 2.9% in Q1, beating Wall Street estimates",        titleAr: "الناتج المحلي الأمريكي ينمو 2.9% في Q1 متجاوزاً توقعات وول ستريت",      date: "19 May 26", category: "Macro" },
  { id: "un7", title: "Fintech files for $4bn Nasdaq IPO",                              titleAr: "شركة تقنية مالية تتقدم بطلب اكتتاب في ناسداك بقيمة 4 مليارات دولار",     date: "18 May 26", category: "IPO" },
  { id: "un8", title: "Amazon AWS signs multi-year AI infrastructure deals",           titleAr: "أمازون AWS توقع صفقات بنية تحتية للذكاء الاصطناعي متعددة السنوات",       date: "17 May 26", category: "Corporate" },
];
