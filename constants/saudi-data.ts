/**
 * SmartSignals — Saudi (Tadawul) Market Data
 * Mirror of Egypt data structure, populated with KSA stocks
 */

export interface SaudiStock {
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
  tadawul: number;          // vs Tadawul All Share Index
  thesis: string;
  thesisAr: string;
}

export const SAUDI_FUNDAMENTAL: SaudiStock[] = [
  {
    ticker: "2222", company: "Saudi Aramco", companyAr: "أرامكو السعودية",
    sector: "Energy", sectorAr: "الطاقة",
    signal: "Invest", analyst: "Shahd Raafat", initiatedDate: "20 May 26",
    targetPrice: 38.50, currentPrice: 27.20, remaining: 41.54, performance: 12.30, tadawul: 4.20,
    thesis: "World's largest oil producer with unmatched reserve base and lowest lifting costs. Dividend yield of 4.8% provides floor. Vision 2030 diversification adds long-term optionality.",
    thesisAr: "أكبر منتج للنفط في العالم باحتياطيات غير مسبوقة وأدنى تكاليف استخراج. عائد توزيعات أرباح 4.8% يوفر دعمًا للسعر.",
  },
  {
    ticker: "1010", company: "Al-Rajhi Bank", companyAr: "مصرف الراجحي",
    sector: "Banking", sectorAr: "البنوك",
    signal: "Invest", analyst: "Ahmed Abdelnaby", initiatedDate: "18 May 26",
    targetPrice: 142.00, currentPrice: 108.40, remaining: 30.99, performance: 8.10, tadawul: 2.30,
    thesis: "Largest Islamic bank globally by assets. Strong NIMs with rate tailwinds. Digital banking penetration at 72% — highest in KSA. TP SAR 142.",
    thesisAr: "أكبر بنك إسلامي عالمياً من حيث الأصول. هوامش ربحية قوية مع دعم أسعار الفائدة. اختراق مصرفي رقمي 72% — الأعلى في المملكة.",
  },
  {
    ticker: "2010", company: "SABIC", companyAr: "سابك",
    sector: "Petrochemicals", sectorAr: "البتروكيماويات",
    signal: "Hold", analyst: "Salma Osama", initiatedDate: "15 May 26",
    targetPrice: 84.00, currentPrice: 76.30, remaining: 10.09, performance: 3.40, tadawul: 1.10,
    thesis: "Global petrochemical leader with diversified product mix. Near-term headwind from soft ethylene margins; hold for cycle recovery in H2-26.",
    thesisAr: "رائد عالمي في البتروكيماويات بمزيج منتجات متنوع. ضغوط قصيرة الأجل من هوامش الإيثيلين الضعيفة؛ احتفظ لانتعاش الدورة في النصف الثاني 2026.",
  },
  {
    ticker: "7010", company: "STC Group", companyAr: "الاتصالات السعودية",
    sector: "Telecom", sectorAr: "الاتصالات",
    signal: "Invest", analyst: "Salma Osama", initiatedDate: "12 May 26",
    targetPrice: 58.00, currentPrice: 42.70, remaining: 35.83, performance: 15.60, tadawul: 9.40,
    thesis: "Dominant telecom with 5G leadership and fintech (STC Pay) embedded option. Vision 2030 digital infra tailwinds. Initiate INVEST at TP SAR 58.",
    thesisAr: "الاتصالات المهيمنة بريادة في الجيل الخامس وخيار التقنية المالية (STC Pay). دعم من البنية التحتية الرقمية لرؤية 2030.",
  },
  {
    ticker: "2330", company: "Advanced Petrochem", companyAr: "المتقدمة للبتروكيماويات",
    sector: "Chemicals", sectorAr: "الكيماويات",
    signal: "Invest", analyst: "Ahmed Abdelnaby", initiatedDate: "10 May 26",
    targetPrice: 96.00, currentPrice: 71.50, remaining: 34.27, performance: -5.20, tadawul: -3.80,
    thesis: "Propylene-to-PP conversion with feedstock advantage. Supply disruption clearing by Q3-26. Risk/reward skewed positive at current levels.",
    thesisAr: "تحويل البروبيلين إلى البولي بروبيلين مع ميزة المواد الخام. توقعات انتهاء اضطراب الإمدادات في الربع الثالث 2026.",
  },
];

export interface SaudiTechnical {
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

export const SAUDI_TECHNICAL: SaudiTechnical[] = [
  {
    ticker: "4030", company: "Saudi Kayan Petrochem", signal: "Buy",
    analyst: "Ayman Alshahid", date: "17 May 26",
    entryMin: 10.20, entryMax: 10.70, targetPrice: 15.50, stopLoss: 9.40,
    currentPrice: 10.45, return: 48.33, pattern: "Falling Wedge Breakout",
    timeframe: "Weekly", notes: "Textbook falling wedge with volume confirmation. Entry on daily close above 10.70.",
  },
  {
    ticker: "2380", company: "Petro Rabigh", signal: "Buy",
    analyst: "Rowan", date: "15 May 26",
    entryMin: 12.50, entryMax: 13.00, targetPrice: 18.00, stopLoss: 11.50,
    currentPrice: 12.80, return: 40.63, pattern: "Double Bottom",
    timeframe: "Daily", notes: "Clean double bottom at 12.20 support. Strong volume on second test. Entry confirmed.",
  },
  {
    ticker: "2350", company: "Saudi Fisheries", signal: "Take Profit",
    analyst: "Ayman Alshahid", date: "14 May 26",
    entryMin: 28.00, entryMax: 29.50, targetPrice: 42.00, stopLoss: 26.00,
    currentPrice: 38.80, return: 31.36, pattern: "Ascending Channel",
    timeframe: "Weekly", notes: "Approaching upper channel resistance. Take 30% of position. Remainder hold with trailing stop.",
  },
  {
    ticker: "4001", company: "Saudi Tadawul Group", signal: "Hold",
    analyst: "Rowan", date: "12 May 26",
    entryMin: 190.00, entryMax: 195.00, targetPrice: 260.00, stopLoss: 175.00,
    currentPrice: 204.60, return: 27.20, pattern: "Symmetrical Triangle",
    timeframe: "Daily", notes: "Consolidating in tight triangle. Hold with stop at 175. Resolution expected by end of May.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SAUDI ARTICLES — Latest content for home "Latest Releases" section
// ─────────────────────────────────────────────────────────────────────────────
export const SAUDI_ARTICLES = [
  {
    id: "sa1", type: "article" as const, readTime: 12,
    section: "fundamental" as const,
    title: "BUY 2222: Aramco's unmatched reserve base",
    titleAr: "اشترِ 2222: قاعدة احتياطيات أرامكو الاستثنائية",
    subtitle: "World's largest oil producer with 4.8% dividend yield and Vision 2030 upside.",
    subtitleAr: "أكبر منتج للنفط في العالم بعائد توزيعات 4.8% وإمكانات رؤية 2030.",
    author: ["Shahd Raafat"], date: "21 May 26", tag: "Invest", ticker: "2222",
  },
  {
    id: "sa2", type: "article" as const, readTime: 8,
    section: "fundamental" as const,
    title: "BUY 1010: Al-Rajhi Bank — digital banking dominance",
    titleAr: "اشترِ 1010: مصرف الراجحي — هيمنة البنوك الرقمية",
    subtitle: "Largest Islamic bank globally. 72% digital penetration and strong NIM tailwinds.",
    subtitleAr: "أكبر بنك إسلامي عالمياً. اختراق رقمي 72% وهوامش ربحية قوية.",
    author: ["Ahmed Abdelnaby"], date: "20 May 26", tag: "Invest", ticker: "1010",
  },
  {
    id: "sa3", type: "article" as const, readTime: 6,
    section: "fundamental" as const,
    title: "HOLD 2010: SABIC — waiting for cycle recovery",
    titleAr: "احتفظ 2010: سابك — انتظار انتعاش الدورة",
    subtitle: "Soft ethylene margins create near-term headwind. Hold for H2-26 petrochemical upturn.",
    subtitleAr: "ضعف هوامش الإيثيلين يخلق ضغطاً قصير الأمد. احتفظ لانتعاش البتروكيماويات في H2-26.",
    author: ["Salma Osama"], date: "19 May 26", tag: "Hold", ticker: "2010",
  },
  {
    id: "sa4", type: "article" as const, readTime: 10,
    section: "fundamental" as const,
    title: "BUY 7010: STC Group — 5G leader with fintech option",
    titleAr: "اشترِ 7010: مجموعة STC — رائد الجيل الخامس مع خيار التقنية المالية",
    subtitle: "Dominant telecom with embedded STC Pay fintech. Vision 2030 digital infra tailwinds.",
    subtitleAr: "الاتصالات المهيمنة مع STC Pay المدمجة. دعم من البنية التحتية الرقمية لرؤية 2030.",
    author: ["Salma Osama"], date: "18 May 26", tag: "Invest", ticker: "7010",
  },
  {
    id: "sa5", type: "video" as const, readTime: 45,
    section: "live" as const,
    title: "Tadawul Weekly Live — Rowan — 17 May 2026",
    titleAr: "البث المباشر الأسبوعي لتداول — روان — 17 مايو 2026",
    subtitle: "Weekly Tadawul market review: sector rotation, top movers, and upcoming catalysts.",
    subtitleAr: "مراجعة أسبوعية لسوق تداول: تدوير القطاعات، أبرز المتحركين، والمحفزات القادمة.",
    author: ["Rowan"], date: "17 May 26",
  },
  {
    id: "sa6", type: "article" as const, readTime: 7,
    section: "fundamental" as const,
    title: "BUY 2330: Advanced Petrochem — risk/reward skewed positive",
    titleAr: "اشترِ 2330: المتقدمة للبتروكيماويات — مخاطرة وعائد إيجابي",
    subtitle: "Propylene-to-PP conversion with feedstock advantage. Supply disruption clearing by Q3-26.",
    subtitleAr: "تحويل البروبيلين مع ميزة المواد الخام. توقعات انتهاء اضطراب الإمدادات في Q3-26.",
    author: ["Ahmed Abdelnaby"], date: "17 May 26", tag: "Invest", ticker: "2330",
  },
];

export const SAUDI_NEWS = [
  { id: "sn1", title: "Aramco posts record Q1 net income on output expansion",      titleAr: "أرامكو تسجل صافي دخل قياسياً في Q1 مع توسعة الإنتاج",                    date: "21 May 26", category: "Earnings" },
  { id: "sn2", title: "SAMA keeps repo rate at 5.75%; signals cautious easing",     titleAr: "ساما تُبقي على سعر الريبو عند 5.75%؛ تُلمح لتيسير حذر",                 date: "21 May 26", category: "Macro" },
  { id: "sn3", title: "Tadawul hits 3-year high on foreign institutional inflows",   titleAr: "تداول يبلغ أعلى مستوى في 3 سنوات بدعم تدفقات المؤسسات الأجنبية",       date: "20 May 26", category: "Market" },
  { id: "sn4", title: "Vision 2030: Saudi GDP grows 3.8% in Q1, beating estimates", titleAr: "رؤية 2030: الناتج المحلي السعودي ينمو 3.8% في Q1 متجاوزاً التوقعات",    date: "20 May 26", category: "Macro" },
  { id: "sn5", title: "Acwa Power wins 1.2 GW solar project in Neom megacity",      titleAr: "أكوا باور تفوز بمشروع طاقة شمسية 1.2 جيجاواط في نيوم",                 date: "19 May 26", category: "Corporate" },
  { id: "sn6", title: "Al-Rajhi Bank Q1 profits rise 14% YoY on loan growth",       titleAr: "أرباح مصرف الراجحي ترتفع 14% سنوياً مدعومةً بنمو القروض",               date: "19 May 26", category: "Earnings" },
  { id: "sn7", title: "Saudi Arabia to add 4 new companies to Tadawul main board",  titleAr: "السعودية تُضيف 4 شركات جديدة إلى السوق الرئيسية لتداول",                date: "18 May 26", category: "IPO" },
  { id: "sn8", title: "STC Pay raises SAR 1.2bn Series B, targets IPO in 2027",     titleAr: "STC Pay تجمع 1.2 مليار ريال في Series B وتستهدف الطرح العام 2027",      date: "17 May 26", category: "IPO" },
];
