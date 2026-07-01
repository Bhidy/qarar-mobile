/**
 * SmartSignals — Bilingual string dictionary (English + Arabic)
 * Import and use via useTranslation() hook in any component.
 */

export type Locale = "en" | "ar";

const translations = {
  // ── Navigation ──────────────────────────────────────────────────
  nav: {
    home:        { en: "Home",        ar: "الرئيسية" },
    fundamental: { en: "Fundamental", ar: "الأساسي" },
    technical:   { en: "Technical",   ar: "التقني" },
    insights:    { en: "Insights",    ar: "رؤى" },
    inbox:       { en: "Inbox",       ar: "الصندوق" },
  },

  // ── Home ─────────────────────────────────────────────────────────
  home: {
    greeting:        { en: "Good morning",     ar: "صباح الخير" },
    greetingAfternoon:{ en: "Good afternoon",  ar: "مساء الخير" },
    greetingEvening: { en: "Good evening",     ar: "مساء النور" },
    subtitle:        { en: "Here's what's moving the market today.", ar: "هذا ما يحرك السوق اليوم." },
    latestReports:   { en: "Latest Reports",   ar: "أحدث التقارير" },
    marketPulse:     { en: "Market Pulse",     ar: "نبض السوق" },
    yourPortfolios:  { en: "Your Portfolios",  ar: "محافظك" },
    topCalls:        { en: "Top Calls",        ar: "أبرز التوصيات" },
    viewAll:         { en: "View All",         ar: "عرض الكل" },
    egx30:           { en: "EGX 30",           ar: "EGX 30" },
    performance:     { en: "Performance",      ar: "الأداء" },
    remaining:       { en: "Remaining",        ar: "المتبقي" },
    since:           { en: "since inception",  ar: "منذ الإطلاق" },
  },

  // ── Fundamental ──────────────────────────────────────────────────
  fundamental: {
    title:          { en: "Fundamental",        ar: "التحليل الأساسي" },
    subtitle:       { en: "Equity research & investment calls", ar: "بحوث الأسهم والتوصيات الاستثمارية" },
    activeCallsTab: { en: "Active Calls",        ar: "التوصيات الفعّالة" },
    pastPerf:       { en: "Past Performance",    ar: "الأداء السابق" },
    invest:         { en: "Invest",              ar: "استثمر" },
    hold:           { en: "Hold",                ar: "احتفظ" },
    buy:            { en: "Buy",                 ar: "اشترِ" },
    sell:           { en: "Sell",                ar: "بع" },
    takeProfit:     { en: "Take Profit",         ar: "اجنِ الأرباح" },
    remaining:      { en: "Remaining",           ar: "المتبقي" },
    targetPrice:    { en: "Target Price",        ar: "السعر المستهدف" },
    currentPrice:   { en: "Current Price",       ar: "السعر الحالي" },
    analyst:        { en: "Analyst",             ar: "المحلل" },
    updated:        { en: "Updated",             ar: "تحديث" },
    released:       { en: "Released",            ar: "صدر" },
    readReport:     { en: "Read Full Report",    ar: "اقرأ التقرير كاملاً" },
  },

  // ── Technical ────────────────────────────────────────────────────
  technical: {
    title:      { en: "Technical",         ar: "التحليل الفني" },
    subtitle:   { en: "Chart analysis & trade setups", ar: "تحليل الرسوم البيانية وإعدادات التداول" },
    entryZone:  { en: "Entry Zone",        ar: "منطقة الدخول" },
    stopLoss:   { en: "Stop Loss",         ar: "وقف الخسارة" },
    target:     { en: "Target",            ar: "الهدف" },
    pattern:    { en: "Pattern",           ar: "النمط" },
    timeframe:  { en: "Timeframe",         ar: "الإطار الزمني" },
    weeklyWatchlists: { en: "Weekly Watchlists", ar: "قوائم المراقبة الأسبوعية" },
  },

  // ── Insights ─────────────────────────────────────────────────────
  insights: {
    title:          { en: "Insights",             ar: "رؤى وتحليلات" },
    earnings:       { en: "Company Earnings",     ar: "أرباح الشركات" },
    macro:          { en: "Macro Insights",       ar: "رؤى الاقتصاد الكلي" },
    marketWatch:    { en: "Market Watch",         ar: "مراقبة السوق" },
    special:        { en: "Special Coverage",     ar: "تغطية خاصة" },
    portfolios:     { en: "Portfolios",           ar: "المحافظ" },
    howToWin:       { en: "How to Win",           ar: "كيف تنجح" },
  },

  // ── Inbox ────────────────────────────────────────────────────────
  inbox: {
    title:      { en: "Inbox",            ar: "الصندوق" },
    subtitle:   { en: "All your signals, reports & updates", ar: "توصياتك وتقاريرك وتحديثاتك" },
    all:        { en: "All",              ar: "الكل" },
    signals:    { en: "Signals",          ar: "إشارات" },
    reports:    { en: "Reports",          ar: "تقارير" },
    today:      { en: "Today",            ar: "اليوم" },
    yesterday:  { en: "Yesterday",        ar: "أمس" },
    last7Days:  { en: "Last 7 Days",      ar: "آخر 7 أيام" },
    earlier:    { en: "Earlier",          ar: "سابقاً" },
    empty:      { en: "No notifications", ar: "لا توجد إشعارات" },
  },

  // ── Profile ──────────────────────────────────────────────────────
  profile: {
    title:           { en: "Profile",               ar: "الملف الشخصي" },
    appearance:      { en: "Appearance",             ar: "المظهر" },
    theme:           { en: "Theme",                  ar: "المظهر" },
    lightMode:       { en: "Light",                  ar: "فاتح" },
    darkMode:        { en: "Dark",                   ar: "داكن" },
    accentColor:     { en: "Accent Color",           ar: "لون التمييز" },
    language:        { en: "Language",               ar: "اللغة" },
    english:         { en: "English",                ar: "English" },
    arabic:          { en: "عربي",                   ar: "عربي" },
    notifications:   { en: "Notifications",          ar: "الإشعارات" },
    pushNotif:       { en: "Push Notifications",     ar: "الإشعارات الفورية" },
    signalAlerts:    { en: "Signal Alerts",          ar: "تنبيهات الإشارات" },
    liveAlerts:      { en: "Live Alerts",            ar: "التنبيهات المباشرة" },
    newReports:      { en: "New Reports",            ar: "تقارير جديدة" },
    priceAlerts:     { en: "Price Alerts",           ar: "تنبيهات الأسعار" },
    account:         { en: "Account",                ar: "الحساب" },
    privacy:         { en: "Privacy Policy",         ar: "سياسة الخصوصية" },
    terms:           { en: "Terms of Service",       ar: "شروط الخدمة" },
    support:         { en: "Help & Support",         ar: "المساعدة والدعم" },
    signOut:         { en: "Sign Out",               ar: "تسجيل الخروج" },
    signOutConfirm:  { en: "Are you sure you want to sign out?", ar: "هل أنت متأكد من تسجيل الخروج؟" },
    cancel:          { en: "Cancel",                 ar: "إلغاء" },
    changePhoto:     { en: "Change Photo",           ar: "تغيير الصورة" },
    chooseFromLib:   { en: "Choose from Library",    ar: "اختر من المكتبة" },
    takePhoto:       { en: "Take Photo",             ar: "التقاط صورة" },
    editProfile:        { en: "Edit Profile",        ar: "تعديل الملف الشخصي" },
    changePassword:     { en: "Change Password",     ar: "تغيير كلمة المرور" },
    changePasswordPrompt:{ en: "Enter your new password (8+ characters):", ar: "أدخل كلمة المرور الجديدة (٨ أحرف على الأقل):" },
    changeEmail:        { en: "Change Email",        ar: "تغيير البريد الإلكتروني" },
    changeEmailPrompt:  { en: "Enter your new email address:", ar: "أدخل عنوان بريدك الإلكتروني الجديد:" },
    editProfileTitle:   { en: "Edit Profile",        ar: "تعديل الملف الشخصي" },
    articlesRead:    { en: "Articles Read",          ar: "مقالات مقروءة" },
    activeCalls:     { en: "Active Calls",           ar: "توصيات فعّالة" },
    portfolios:      { en: "Portfolios",             ar: "محافظ" },
    unread:          { en: "Unread",                 ar: "غير مقروءة" },
  },

  // ── Market selector ──────────────────────────────────────────────
  market: {
    selectMarket: { en: "Select Market", ar: "اختر السوق" },
    egypt:        { en: "Egypt (EGX)",   ar: "مصر (EGX)" },
    saudi:        { en: "Saudi (Tadawul)", ar: "السعودية (تداول)" },
    usa:          { en: "USA (NYSE/NASDAQ)", ar: "الولايات المتحدة (NYSE/NASDAQ)" },
    currency:     { en: "Currency",      ar: "العملة" },
  },

  // ── Common ───────────────────────────────────────────────────────
  common: {
    loading:    { en: "Loading…",    ar: "جارٍ التحميل…" },
    error:      { en: "Error",       ar: "خطأ" },
    retry:      { en: "Retry",       ar: "إعادة المحاولة" },
    back:       { en: "Back",        ar: "رجوع" },
    close:      { en: "Close",       ar: "إغلاق" },
    confirm:    { en: "Confirm",     ar: "تأكيد" },
    save:       { en: "Save",        ar: "حفظ" },
    readMore:   { en: "Read more",   ar: "اقرأ المزيد" },
    minRead:    { en: "min read",    ar: "دقيقة قراءة" },
    by:         { en: "by",          ar: "بقلم" },
    egp:        { en: "EGP",         ar: "ج.م" },
    sar:        { en: "SAR",         ar: "ر.س" },
    viewAll:    { en: "View All",    ar: "عرض الكل" },
    selectAll:  { en: "Select All",  ar: "تحديد الكل" },
    cancel:     { en: "Cancel",      ar: "إلغاء" },
  },
} as const;

// Helper type
type TranslationKey<T> = T extends Record<string, { en: string; ar: string }> ? keyof T : never;

/** Flat translate helper — call t("profile.title") */
export function getTranslation(
  path: string,
  locale: Locale
): string {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = translations;
  for (const p of parts) {
    node = node?.[p];
    // Defensive: a missing key must NEVER surface a raw dotted path (e.g. the
    // "profile.editProfile" bug) to the user. Humanize the last segment instead.
    if (!node) return humanizeKey(parts[parts.length - 1]);
  }
  return node?.[locale] ?? node?.en ?? humanizeKey(parts[parts.length - 1]);
}

/** "changePassword" → "Change Password", "editProfile" → "Edit Profile". */
function humanizeKey(seg: string): string {
  const spaced = seg
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : seg;
}

export { translations };
export default translations;
