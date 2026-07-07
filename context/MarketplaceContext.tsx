/**
 * Analyst Marketplace (mobile) — combined selection + subscription state.
 *
 * One AsyncStorage-backed provider (mirrors the web's split contexts). Holds the
 * in-progress choice (plan + picked analysts, slot-enforced) and the single
 * active bundle subscription. Frontend-only mock — Phase 2 swaps the persistence
 * for a real entitlements API behind the same hook surface.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BUNDLES, bundleById, isUnlimited, slotCountOf, smallestBundleFor, type Bundle, type BundleId,
} from "@/lib/marketplace/bundles";

const SEL_KEY = "@mkt_selection_v1";
const SUB_KEY = "@mkt_subscription_v1";
const DAY = 24 * 60 * 60 * 1000;

export interface ActiveSubscription {
  planId: BundleId;
  analystIds: string[];
  since: string;
  priceUSD: number;
}

interface SelectionState {
  planId: BundleId | null;
  ids: string[];
}

interface MarketplaceValue {
  hydrated: boolean;

  // Selection (in-progress)
  selPlanId: BundleId | null;
  selPlan: Bundle | null;
  selectedIds: string[];
  selCount: number;
  selSlotLimit: number;
  selSlotsLeft: number;
  selUnlimited: boolean;
  selFull: boolean;
  isSelected: (id: string) => boolean;
  canAdd: (id: string) => boolean;
  setPlan: (id: BundleId | null) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;

  // Subscription (active)
  subscription: ActiveSubscription | null;
  subPlan: Bundle | null;
  subPlanId: BundleId | null;
  analystIds: string[];
  isActive: boolean;
  subSlotsLeft: number;
  isSubscribedToAnalyst: (id: string) => boolean;
  subscribe: (planId: BundleId, analystIds: string[], priceUSD: number) => void;
  cancel: () => void;
  changePlan: (planId: BundleId, priceUSD: number) => void;
  addAnalyst: (id: string) => void;
  removeAnalyst: (id: string) => void;
  nextBilling: () => number | null;
}

const MarketplaceContext = createContext<MarketplaceValue | null>(null);

function capIds(planId: BundleId | null, ids: string[]): string[] {
  const plan = bundleById(planId);
  if (!plan || isUnlimited(plan)) return ids;
  return ids.slice(0, slotCountOf(plan));
}

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [sel, setSel] = useState<SelectionState>({ planId: null, ids: [] });
  const [sub, setSub] = useState<ActiveSubscription | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate
  useEffect(() => {
    (async () => {
      try {
        const [rawSel, rawSub] = await Promise.all([
          AsyncStorage.getItem(SEL_KEY),
          AsyncStorage.getItem(SUB_KEY),
        ]);
        if (rawSel) {
          const p = JSON.parse(rawSel);
          if (p && Array.isArray(p.ids)) {
            const planId: BundleId | null = BUNDLES.some((b) => b.id === p.planId) ? p.planId : null;
            setSel({ planId, ids: capIds(planId, p.ids.filter((x: unknown) => typeof x === "string")) });
          }
        }
        if (rawSub) {
          const p = JSON.parse(rawSub);
          if (p && BUNDLES.some((b) => b.id === p.planId) && Array.isArray(p.analystIds)) {
            setSub({
              planId: p.planId,
              analystIds: p.analystIds.filter((x: unknown) => typeof x === "string"),
              since: typeof p.since === "string" ? p.since : new Date().toISOString(),
              priceUSD: typeof p.priceUSD === "number" ? p.priceUSD : 0,
            });
          }
        }
      } catch { /* ignore */ }
      setHydrated(true);
    })();
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SEL_KEY, JSON.stringify(sel)).catch(() => {});
  }, [sel, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (sub) AsyncStorage.setItem(SUB_KEY, JSON.stringify(sub)).catch(() => {});
    else AsyncStorage.removeItem(SUB_KEY).catch(() => {});
  }, [sub, hydrated]);

  const value = useMemo<MarketplaceValue>(() => {
    // Selection derived
    const selPlan = bundleById(sel.planId) ?? null;
    const selUnlimited = selPlan ? isUnlimited(selPlan) : false;
    const selSlotLimit = selPlan ? slotCountOf(selPlan) : 0;
    const selCount = sel.ids.length;
    const selSlotsLeft = selPlan ? (selUnlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, selSlotLimit - selCount)) : 0;
    const selFull = !!selPlan && !selUnlimited && selCount >= selSlotLimit;
    const isSelected = (id: string) => sel.ids.includes(id);

    // Subscription derived
    const subPlan = bundleById(sub?.planId) ?? null;
    const analystIds = sub?.analystIds ?? [];
    const subSlotsLeft = subPlan
      ? (isUnlimited(subPlan) ? Number.MAX_SAFE_INTEGER : Math.max(0, slotCountOf(subPlan) - analystIds.length))
      : 0;

    const addToSel = (id: string) =>
      setSel((prev) => {
        if (prev.ids.includes(id)) return prev;
        const planId = prev.planId ?? smallestBundleFor(prev.ids.length + 1).id;
        const plan = bundleById(planId)!;
        if (!isUnlimited(plan) && prev.ids.length >= slotCountOf(plan)) return { ...prev, planId };
        return { planId, ids: [...prev.ids, id] };
      });

    return {
      hydrated,
      selPlanId: sel.planId, selPlan, selectedIds: sel.ids, selCount,
      selSlotLimit, selSlotsLeft, selUnlimited, selFull,
      isSelected,
      canAdd: (id: string) => isSelected(id) || !selFull,
      setPlan: (id) => setSel((prev) => ({ planId: id, ids: capIds(id, prev.ids) })),
      addToSelection: addToSel,
      removeFromSelection: (id) => setSel((prev) => ({ ...prev, ids: prev.ids.filter((x) => x !== id) })),
      toggleSelection: (id) =>
        sel.ids.includes(id)
          ? setSel((prev) => ({ ...prev, ids: prev.ids.filter((x) => x !== id) }))
          : addToSel(id),
      clearSelection: () => setSel({ planId: null, ids: [] }),

      subscription: sub,
      subPlan, subPlanId: sub?.planId ?? null, analystIds,
      isActive: !!sub, subSlotsLeft,
      isSubscribedToAnalyst: (id: string) => analystIds.includes(id),
      subscribe: (planId, ids, priceUSD) =>
        setSub({ planId, analystIds: capIds(planId, ids), since: new Date().toISOString(), priceUSD }),
      cancel: () => setSub(null),
      changePlan: (planId, priceUSD) =>
        setSub((prev) => (prev ? { ...prev, planId, priceUSD, analystIds: capIds(planId, prev.analystIds) } : prev)),
      addAnalyst: (id) =>
        setSub((prev) => {
          if (!prev || prev.analystIds.includes(id)) return prev;
          const plan = bundleById(prev.planId)!;
          if (!isUnlimited(plan) && prev.analystIds.length >= slotCountOf(plan)) return prev;
          return { ...prev, analystIds: [...prev.analystIds, id] };
        }),
      removeAnalyst: (id) => setSub((prev) => (prev ? { ...prev, analystIds: prev.analystIds.filter((x) => x !== id) } : prev)),
      nextBilling: () => (sub ? new Date(sub.since).getTime() + 30 * DAY : null),
    };
  }, [sel, sub, hydrated]);

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace(): MarketplaceValue {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error("useMarketplace must be used within MarketplaceProvider");
  return ctx;
}
