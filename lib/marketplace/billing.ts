/**
 * Analyst Marketplace (mobile) — billing cadence (monthly vs annual).
 * Mirrors web/lib/marketplace/billing.ts. Annual = 2 months free (~17% off).
 * Discount math is done in the display amount, never on the USD anchor.
 */
export type BillingPeriod = "monthly" | "annual";

export const ANNUAL_MONTHS_CHARGED = 10;
export const ANNUAL_SAVINGS_PCT = Math.round((1 - ANNUAL_MONTHS_CHARGED / 12) * 100);
export const ANNUAL_MONTHS_FREE = 12 - ANNUAL_MONTHS_CHARGED;

export interface AnnualBreakdown {
  annualTotal: number;
  effectiveMonthly: number;
}

export function annualFrom(monthlyAmount: number): AnnualBreakdown {
  const annualTotal = monthlyAmount * ANNUAL_MONTHS_CHARGED;
  return { annualTotal, effectiveMonthly: annualTotal / 12 };
}

export function chargedAmount(monthlyAmount: number, period: BillingPeriod): number {
  return period === "annual" ? monthlyAmount * ANNUAL_MONTHS_CHARGED : monthlyAmount;
}

export function renewalDays(period: BillingPeriod): number {
  return period === "annual" ? 365 : 30;
}
