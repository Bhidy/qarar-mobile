// Index Updates — analyst commentary on a market index (EGX30/EGX70/TASI/S&P 500/
// Nasdaq 100/Dow Jones), distinct from per-stock Technical Calls. Mirrors
// web/lib/index-catalog.ts + web/lib/types.ts's IndexUpdate exactly — duplicated
// here (not shared via a package) since mobile and web are separate codebases.
// Symbols verified directly against the live TradingView free-embed widget.
export interface IndexUpdate {
  id: string;
  indexSymbol: string;
  market: "egypt" | "saudi" | "usa";
  analyst?: string;
  overview?: "Bullish" | "Bearish" | "Neutral";
  currentPrice?: number;
  title: string;
  titleAr?: string;
  body?: string;
  bodyAr?: string;
  chartSymbol?: string;
  chartInterval?: string;
  chartImage?: string;
  date?: string;
  published?: boolean;
}

export interface IndexCatalogEntry {
  value: string;
  labelEn: string;
  labelAr: string;
  countryEn: string;
  countryAr: string;
  flag: string;
  fullNameEn: string;
  fullNameAr: string;
  market: "egypt" | "saudi" | "usa";
  defaultChartSymbol: string;
}

export const INDEX_CATALOG: IndexCatalogEntry[] = [
  {
    value: "EGX30", labelEn: "EGX 30", labelAr: "إي جي إكس 30",
    countryEn: "Egypt", countryAr: "مصر", flag: "🇪🇬",
    fullNameEn: "Egyptian Exchange 30 Index", fullNameAr: "مؤشر البورصة المصرية الرئيسي (EGX 30)",
    market: "egypt", defaultChartSymbol: "EGX:EGX30",
  },
  {
    value: "EGX70", labelEn: "EGX 70", labelAr: "إي جي إكس 70",
    countryEn: "Egypt", countryAr: "مصر", flag: "🇪🇬",
    fullNameEn: "Egyptian Exchange 70 Price Return Index", fullNameAr: "مؤشر EGX 70 لعائد الأسعار",
    market: "egypt", defaultChartSymbol: "EGX:EGX70EWI",
  },
  {
    // "TADAWUL:TASI" is the correct, real TradingView symbol — it just isn't
    // entitled on the free public widget tier (same as every individual Tadawul
    // stock). Pre-existing exchange-wide data-licensing gap, tracked separately.
    value: "TASI", labelEn: "TASI", labelAr: "تاسي",
    countryEn: "Saudi Arabia", countryAr: "السعودية", flag: "🇸🇦",
    fullNameEn: "Tadawul All Share Index", fullNameAr: "المؤشر العام لسوق الأسهم السعودية (تاسي)",
    market: "saudi", defaultChartSymbol: "TADAWUL:TASI",
  },
  {
    value: "SPX500", labelEn: "S&P 500", labelAr: "إس آند بي 500",
    countryEn: "United States", countryAr: "الولايات المتحدة", flag: "🇺🇸",
    fullNameEn: "S&P 500 Index", fullNameAr: "مؤشر إس آند بي 500",
    market: "usa", defaultChartSymbol: "OANDA:SPX500USD",
  },
  {
    value: "NDX", labelEn: "Nasdaq 100", labelAr: "ناسداك 100",
    countryEn: "United States", countryAr: "الولايات المتحدة", flag: "🇺🇸",
    fullNameEn: "Nasdaq-100 Index", fullNameAr: "مؤشر ناسداك 100",
    market: "usa", defaultChartSymbol: "OANDA:NAS100USD",
  },
  {
    value: "DJI", labelEn: "Dow Jones", labelAr: "داو جونز",
    countryEn: "United States", countryAr: "الولايات المتحدة", flag: "🇺🇸",
    fullNameEn: "Dow Jones Industrial Average", fullNameAr: "مؤشر داو جونز الصناعي",
    market: "usa", defaultChartSymbol: "OANDA:US30USD",
  },
];

export function indexCatalogEntry(value?: string | null): IndexCatalogEntry | undefined {
  return INDEX_CATALOG.find(e => e.value === value);
}
