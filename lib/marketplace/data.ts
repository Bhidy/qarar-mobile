/**
 * Analyst Marketplace (mobile) — MOCK dataset. Illustrative demo data only,
 * shaped to map 1:1 onto a Phase-2 backend (replace ANALYSTS with an API fetch).
 * A representative set across Egypt · Saudi · USA, fundamental/technical/both,
 * Mubasher & public analysts.
 */
import type { AnalystProfile } from "./types";

export const ANALYSTS: AnalystProfile[] = [
  {
    id: "an-karim-adel", slug: "karim-adel", name: "Karim Adel", nameAr: "كريم عادل",
    role: "Senior Equity Strategist", roleAr: "كبير محللي الأسهم",
    bio: "15 years covering the EGX with a conviction-led, fundamentals-first process across banks, industrials and telecom.",
    bioAr: "خمسة عشر عامًا في تغطية البورصة المصرية بمنهج قائم على القناعة والتحليل الأساسي في قطاعات البنوك والصناعة والاتصالات.",
    country: "Egypt", countryAr: "مصر", countryFlag: "🇪🇬", market: "egypt",
    languages: ["ar", "en"], analystType: "mubasher", coverage: "both",
    specialties: ["Banks", "Industrials", "Telecom"], specialtiesAr: ["البنوك", "الصناعة", "الاتصالات"],
    metrics: { publishedSignals: 214, successRate: 78, avgReturn: 22.4, activeSignals: 12, closedSignals: 202, subscribers: 3120 },
    verified: true, recommended: true,
    latestSignals: [
      { id: "s1", ticker: "COMI", company: "Commercial Intl Bank", companyAr: "البنك التجاري الدولي", signal: "Invest", kind: "fundamental", status: "active", market: "egypt", date: "2026-06-28", returnPct: 18.5 },
      { id: "s2", ticker: "SWDY", company: "Elsewedy Electric", companyAr: "السويدي إليكتريك", signal: "Buy", kind: "fundamental", status: "closed", market: "egypt", date: "2026-05-14", returnPct: 26.1 },
      { id: "s3", ticker: "ETEL", company: "Telecom Egypt", companyAr: "المصرية للاتصالات", signal: "Hold", kind: "technical", status: "active", market: "egypt", date: "2026-06-10", returnPct: 4.2 },
    ],
  },
  {
    id: "an-nadia-hassan", slug: "nadia-hassan", name: "Nadia Hassan", nameAr: "نادية حسن",
    role: "Banking & Financials Analyst", roleAr: "محللة قطاع البنوك والمال",
    bio: "Deep-dive fundamental research on Egyptian banks, NBFC and insurance names.",
    bioAr: "أبحاث أساسية متعمقة في البنوك المصرية وشركات التمويل غير المصرفي والتأمين.",
    country: "Egypt", countryAr: "مصر", countryFlag: "🇪🇬", market: "egypt",
    languages: ["ar"], analystType: "mubasher", coverage: "fundamental",
    specialties: ["Banks", "Insurance", "NBFC"], specialtiesAr: ["البنوك", "التأمين", "التمويل غير المصرفي"],
    metrics: { publishedSignals: 96, successRate: 74, avgReturn: 17.9, activeSignals: 7, closedSignals: 89, subscribers: 1440 },
    verified: true, recommended: false,
    latestSignals: [
      { id: "s4", ticker: "HRHO", company: "EFG Holding", companyAr: "المجموعة المالية هيرميس", signal: "Buy", kind: "fundamental", status: "active", market: "egypt", date: "2026-06-22", returnPct: 12.0 },
      { id: "s5", ticker: "ABUK", company: "Abu Qir Fertilizers", companyAr: "أبو قير للأسمدة", signal: "Invest", kind: "fundamental", status: "closed", market: "egypt", date: "2026-04-30", returnPct: 20.7 },
    ],
  },
  {
    id: "an-omar-sherif", slug: "omar-sherif", name: "Omar Sherif", nameAr: "عمر شريف",
    role: "Technical Analyst", roleAr: "محلل فني",
    bio: "Price-action and momentum setups on liquid EGX large-caps, daily and weekly horizons.",
    bioAr: "إعدادات تعتمد على حركة السعر والزخم على الأسهم القيادية في البورصة المصرية على المدى اليومي والأسبوعي.",
    country: "Egypt", countryAr: "مصر", countryFlag: "🇪🇬", market: "egypt",
    languages: ["ar", "en"], analystType: "public", coverage: "technical",
    specialties: ["Momentum", "Breakouts", "Swing"], specialtiesAr: ["الزخم", "الاختراقات", "المضاربة"],
    metrics: { publishedSignals: 168, successRate: 66, avgReturn: 11.3, activeSignals: 9, closedSignals: 159, subscribers: 980 },
    verified: false, recommended: false,
    latestSignals: [
      { id: "s6", ticker: "TMGH", company: "Talaat Moustafa Group", companyAr: "مجموعة طلعت مصطفى", signal: "Buy", kind: "technical", status: "active", market: "egypt", date: "2026-06-29", returnPct: 8.0 },
      { id: "s7", ticker: "EAST", company: "Eastern Company", companyAr: "الشرقية إيسترن", signal: "Take Profit", kind: "technical", status: "closed", market: "egypt", date: "2026-06-02", returnPct: 14.6 },
    ],
  },
  {
    id: "an-faisal-alotaibi", slug: "faisal-alotaibi", name: "Faisal Al-Otaibi", nameAr: "فيصل العتيبي",
    role: "Energy & Petrochemicals Analyst", roleAr: "محلل الطاقة والبتروكيماويات",
    bio: "Fundamental coverage of Saudi energy, petrochemicals and utilities on Tadawul.",
    bioAr: "تغطية أساسية لقطاعات الطاقة والبتروكيماويات والمرافق في السوق السعودي.",
    country: "Saudi Arabia", countryAr: "السعودية", countryFlag: "🇸🇦", market: "saudi",
    languages: ["ar", "en"], analystType: "mubasher", coverage: "fundamental",
    specialties: ["Energy", "Petrochemicals", "Utilities"], specialtiesAr: ["الطاقة", "البتروكيماويات", "المرافق"],
    metrics: { publishedSignals: 156, successRate: 80, avgReturn: 24.9, activeSignals: 10, closedSignals: 146, subscribers: 2900 },
    verified: true, recommended: true,
    latestSignals: [
      { id: "s8", ticker: "2222", company: "Saudi Aramco", companyAr: "أرامكو السعودية", signal: "Invest", kind: "fundamental", status: "active", market: "saudi", date: "2026-06-27", returnPct: 9.4 },
      { id: "s9", ticker: "2010", company: "SABIC", companyAr: "سابك", signal: "Buy", kind: "fundamental", status: "closed", market: "saudi", date: "2026-05-20", returnPct: 21.2 },
    ],
  },
  {
    id: "an-dana-almansoori", slug: "dana-almansoori", name: "Dana Al-Mansoori", nameAr: "دانة المنصوري",
    role: "GCC Banks & Financials Analyst", roleAr: "محللة بنوك ومال الخليج",
    bio: "Bilingual coverage of GCC banks and financials with a fundamental and technical blend.",
    bioAr: "تغطية ثنائية اللغة لبنوك ومال الخليج بمزيج من التحليل الأساسي والفني.",
    country: "United Arab Emirates", countryAr: "الإمارات", countryFlag: "🇦🇪", market: "saudi",
    languages: ["ar", "en"], analystType: "mubasher", coverage: "both",
    specialties: ["Banks", "Financials", "Real Estate"], specialtiesAr: ["البنوك", "المال", "العقارات"],
    metrics: { publishedSignals: 132, successRate: 79, avgReturn: 19.7, activeSignals: 8, closedSignals: 124, subscribers: 2100 },
    verified: true, recommended: false,
    latestSignals: [
      { id: "s10", ticker: "1120", company: "Al Rajhi Bank", companyAr: "مصرف الراجحي", signal: "Invest", kind: "fundamental", status: "active", market: "saudi", date: "2026-06-24", returnPct: 11.1 },
      { id: "s11", ticker: "1180", company: "Saudi National Bank", companyAr: "البنك الأهلي السعودي", signal: "Buy", kind: "technical", status: "closed", market: "saudi", date: "2026-05-08", returnPct: 15.9 },
    ],
  },
  {
    id: "an-abdullah-alghamdi", slug: "abdullah-alghamdi", name: "Abdullah Al-Ghamdi", nameAr: "عبدالله الغامدي",
    role: "Senior Market Strategist", roleAr: "كبير خبراء السوق",
    bio: "Momentum and swing setups across Tadawul large- and mid-caps.",
    bioAr: "إعدادات الزخم والمضاربة على الأسهم القيادية والمتوسطة في السوق السعودي.",
    country: "Saudi Arabia", countryAr: "السعودية", countryFlag: "🇸🇦", market: "saudi",
    languages: ["ar", "en"], analystType: "mubasher", coverage: "both",
    specialties: ["Momentum", "Indices", "Swing"], specialtiesAr: ["الزخم", "المؤشرات", "المضاربة"],
    metrics: { publishedSignals: 188, successRate: 77, avgReturn: 20.5, activeSignals: 11, closedSignals: 177, subscribers: 2600 },
    verified: true, recommended: false,
    latestSignals: [
      { id: "s12", ticker: "7010", company: "STC", companyAr: "الاتصالات السعودية", signal: "Hold", kind: "technical", status: "active", market: "saudi", date: "2026-06-26", returnPct: 3.6 },
      { id: "s13", ticker: "1211", company: "Maaden", companyAr: "معادن", signal: "Buy", kind: "fundamental", status: "closed", market: "saudi", date: "2026-05-30", returnPct: 18.2 },
    ],
  },
  {
    id: "an-emily-carter", slug: "emily-carter", name: "Emily Carter", nameAr: "إميلي كارتر",
    role: "Mega-Cap & Technology Analyst", roleAr: "محللة الشركات الكبرى والتقنية",
    bio: "Fundamental coverage of US mega-cap technology, software and platforms.",
    bioAr: "تغطية أساسية للشركات الأمريكية الكبرى في التقنية والبرمجيات والمنصات.",
    country: "United States", countryAr: "الولايات المتحدة", countryFlag: "🇺🇸", market: "usa",
    languages: ["en"], analystType: "mubasher", coverage: "fundamental",
    specialties: ["Mega-cap Tech", "Software", "Platforms"], specialtiesAr: ["التقنية الكبرى", "البرمجيات", "المنصات"],
    metrics: { publishedSignals: 178, successRate: 82, avgReturn: 28.6, activeSignals: 11, closedSignals: 167, subscribers: 5200 },
    verified: true, recommended: true,
    latestSignals: [
      { id: "s14", ticker: "AAPL", company: "Apple", companyAr: "أبل", signal: "Invest", kind: "fundamental", status: "active", market: "usa", date: "2026-06-25", returnPct: 24.0 },
      { id: "s15", ticker: "MSFT", company: "Microsoft", companyAr: "مايكروسوفت", signal: "Buy", kind: "fundamental", status: "closed", market: "usa", date: "2026-05-12", returnPct: 31.2 },
    ],
  },
  {
    id: "an-noura-althani", slug: "noura-althani", name: "Noura Al-Thani", nameAr: "نورة آل ثاني",
    role: "US Equity & Technology Analyst", roleAr: "محللة الأسهم الأمريكية والتقنية",
    bio: "Fundamental research on US technology and growth equities.",
    bioAr: "أبحاث أساسية على أسهم التقنية والنمو الأمريكية.",
    country: "Qatar", countryAr: "قطر", countryFlag: "🇶🇦", market: "usa",
    languages: ["en"], analystType: "mubasher", coverage: "fundamental",
    specialties: ["Growth", "Semis", "Cloud"], specialtiesAr: ["النمو", "الرقائق", "الحوسبة السحابية"],
    metrics: { publishedSignals: 104, successRate: 81, avgReturn: 26.0, activeSignals: 9, closedSignals: 95, subscribers: 1800 },
    verified: true, recommended: false,
    latestSignals: [
      { id: "s16", ticker: "NVDA", company: "NVIDIA", companyAr: "إنفيديا", signal: "Invest", kind: "fundamental", status: "active", market: "usa", date: "2026-06-23", returnPct: 29.5 },
      { id: "s17", ticker: "AMZN", company: "Amazon", companyAr: "أمازون", signal: "Buy", kind: "fundamental", status: "closed", market: "usa", date: "2026-05-18", returnPct: 17.4 },
    ],
  },
  {
    id: "an-james-okafor", slug: "james-okafor", name: "James Okafor", nameAr: "جيمس أوكافور",
    role: "Technical Strategist", roleAr: "خبير التحليل الفني",
    bio: "Chart-driven momentum and breakout setups on US large-caps and indices.",
    bioAr: "إعدادات الزخم والاختراق المعتمدة على الرسوم البيانية للأسهم الأمريكية الكبرى والمؤشرات.",
    country: "United States", countryAr: "الولايات المتحدة", countryFlag: "🇺🇸", market: "usa",
    languages: ["en"], analystType: "public", coverage: "technical",
    specialties: ["Indices", "Momentum", "Options"], specialtiesAr: ["المؤشرات", "الزخم", "الخيارات"],
    metrics: { publishedSignals: 142, successRate: 69, avgReturn: 13.8, activeSignals: 8, closedSignals: 134, subscribers: 1200 },
    verified: false, recommended: false,
    latestSignals: [
      { id: "s18", ticker: "TSLA", company: "Tesla", companyAr: "تسلا", signal: "Buy", kind: "technical", status: "active", market: "usa", date: "2026-06-28", returnPct: 10.2 },
      { id: "s19", ticker: "SPY", company: "S&P 500 ETF", companyAr: "صندوق إس آند بي ٥٠٠", signal: "Take Profit", kind: "technical", status: "closed", market: "usa", date: "2026-06-05", returnPct: 7.8 },
    ],
  },
];

export function getAllAnalysts(): AnalystProfile[] {
  return ANALYSTS;
}
export function getAnalyst(idOrSlug: string): AnalystProfile | undefined {
  return ANALYSTS.find((a) => a.id === idOrSlug || a.slug === idOrSlug);
}
export function getAnalysts(ids: string[]): AnalystProfile[] {
  return ids
    .map((id) => ANALYSTS.find((a) => a.id === id))
    .filter((a): a is AnalystProfile => Boolean(a));
}
export function recommendedAnalysts(n = 3): AnalystProfile[] {
  return [...ANALYSTS].sort((a, b) => (a.recommended === b.recommended ? 0 : a.recommended ? -1 : 1)).slice(0, n);
}
