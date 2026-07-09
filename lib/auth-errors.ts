/**
 * Localize Supabase auth error messages. Supabase always returns English
 * ("Invalid login credentials" etc.) — in Arabic mode those must render in
 * Arabic (owner rule: NO English text in Arabic mode). Matching is substring +
 * case-insensitive because Supabase wording varies slightly across versions;
 * unknown errors fall back to a generic localized message rather than leaking
 * English into the AR UI.
 *
 * Mirror of web/lib/auth-errors.ts — keep the two maps in sync.
 */

const MAP: Array<{ match: RegExp; ar: string }> = [
  { match: /invalid login credentials/i, ar: "بيانات الدخول غير صحيحة — تحقق من البريد الإلكتروني وكلمة المرور." },
  { match: /email not confirmed/i, ar: "البريد الإلكتروني غير مؤكد — افتح رسالة التأكيد في بريدك أولاً." },
  { match: /user already registered/i, ar: "هذا البريد مسجّل بالفعل — سجّل الدخول بدلاً من ذلك." },
  { match: /already registered|already exists|already been registered/i, ar: "هذا البريد مسجّل بالفعل — سجّل الدخول بدلاً من ذلك." },
  { match: /password should be at least/i, ar: "كلمة المرور قصيرة جدًا — 8 أحرف على الأقل." },
  { match: /rate limit|too many requests|for security purposes/i, ar: "محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة." },
  { match: /invalid email/i, ar: "البريد الإلكتروني غير صحيح." },
  { match: /token has expired|otp.*expired|expired/i, ar: "انتهت صلاحية الرمز/الرابط — اطلب واحدًا جديدًا." },
  { match: /invalid.*token|invalid.*otp|token.*invalid/i, ar: "الرمز غير صحيح — تحقق منه وأعد المحاولة." },
  { match: /user not found|no user found/i, ar: "لا يوجد حساب بهذا البريد الإلكتروني — سجّل أولاً." },
  { match: /signups? not allowed|disabled/i, ar: "التسجيل غير متاح حاليًا — حاول لاحقًا." },
  { match: /network|fetch|failed to fetch|timeout/i, ar: "تعذّر الاتصال — تحقق من اتصالك بالإنترنت وأعد المحاولة." },
  { match: /same.*password|different from the old/i, ar: "كلمة المرور الجديدة يجب أن تختلف عن القديمة." },
  { match: /auth not configured/i, ar: "خدمة الدخول غير مهيأة — حاول لاحقًا." },
];

const GENERIC_AR = "حدث خطأ ما — أعد المحاولة.";

export function localizeAuthError(message: string | undefined, isArabic: boolean): string {
  const msg = (message ?? "").trim();
  if (!isArabic) return msg || "Something went wrong";
  for (const { match, ar } of MAP) if (match.test(msg)) return ar;
  return GENERIC_AR;
}
