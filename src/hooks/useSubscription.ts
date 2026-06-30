import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";

export interface SubscriptionPlan {
  code: string;
  name: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  max_facilities: number | null;
  max_rooms: number | null;
  max_staff: number | null;
  feature_online_payments: boolean;
  feature_ota_sync: boolean;
  feature_advanced_reports: boolean;
  feature_custom_branding: boolean;
  feature_guest_messaging: boolean;
  display_order: number;
  highlight: boolean;
  is_active: boolean;
}

export type PlanFeature =
  | "feature_online_payments"
  | "feature_ota_sync"
  | "feature_advanced_reports"
  | "feature_custom_branding"
  | "feature_guest_messaging";

const FREE_FALLBACK: SubscriptionPlan = {
  code: "free", name: "Free", description: null,
  monthly_price: 0, annual_price: 0,
  max_facilities: 1, max_rooms: 10, max_staff: 3,
  feature_online_payments: false, feature_ota_sync: false,
  feature_advanced_reports: false, feature_custom_branding: false,
  feature_guest_messaging: false,
  display_order: 1, highlight: false, is_active: true,
};

/** All active plans, ordered — used by the billing page and admin editor. */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as SubscriptionPlan[];
    },
  });
}

/**
 * Current facility's subscription, usage, and enforcement helpers.
 * Use inside any page rendered under FacilityProvider.
 */
export function useSubscription() {
  const { facility } = useFacility();

  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ["facility-subscription", facility?.id],
    enabled: !!facility?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_subscriptions")
        .select("plan, status, end_date")
        .eq("facility_id", facility!.id)
        .maybeSingle();
      return data;
    },
  });

  const planCode = sub?.plan ?? "free";

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["subscription-plan", planCode],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("code", planCode)
        .maybeSingle();
      return (data as SubscriptionPlan | null) ?? FREE_FALLBACK;
    },
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["facility-usage", facility?.id],
    enabled: !!facility?.id,
    staleTime: 15_000,
    queryFn: async () => {
      const [{ count: rooms }, { count: staff }] = await Promise.all([
        supabase.from("rooms").select("id", { count: "exact", head: true }).eq("facility_id", facility!.id),
        supabase.from("memberships").select("id", { count: "exact", head: true }).eq("facility_id", facility!.id).eq("status", "active"),
      ]);
      return { rooms: rooms ?? 0, staff: staff ?? 0 };
    },
  });

  const activePlan = plan ?? FREE_FALLBACK;
  const isSuspended = facility?.status === "suspended";
  const isExpired = sub?.status === "expired" || (sub?.end_date ? new Date(sub.end_date) < new Date() : false);

  function checkLimit(type: "rooms" | "staff"): { allowed: boolean; reason?: string } {
    if (isSuspended) return { allowed: false, reason: "This facility has been suspended. Contact support to restore access." };
    const limit = type === "rooms" ? activePlan.max_rooms : activePlan.max_staff;
    if (limit === null) return { allowed: true };
    const current = usage?.[type] ?? 0;
    if (current >= limit) {
      return {
        allowed: false,
        reason: `Your ${activePlan.name} plan allows up to ${limit} ${type === "rooms" ? "rooms" : "staff members"}. Upgrade to add more.`,
      };
    }
    return { allowed: true };
  }

  function hasFeature(feature: PlanFeature): boolean {
    return activePlan[feature];
  }

  return {
    plan: activePlan,
    usage: usage ?? { rooms: 0, staff: 0 },
    isLoading: subLoading || planLoading || usageLoading,
    isSuspended,
    isExpired,
    checkLimit,
    hasFeature,
  };
}

/**
 * Checks a user's total facility count (across all their organizations —
 * each facility owns its own org in this schema) against the most
 * permissive plan among their existing facilities. Used at facility
 * creation time, before FacilityProvider context exists.
 */
export async function checkFacilityLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { data: orgs } = await supabase
    .from("organizations")
    .select("facilities(id, facility_subscriptions(plan))")
    .eq("owner_id", userId);

  const facilities = (orgs ?? []).flatMap((o) => (o.facilities as any[]) ?? []);
  const count = facilities.length;
  if (count === 0) return { allowed: true };

  const planCodes = Array.from(new Set(
    facilities.map((f) => (f.facility_subscriptions as any)?.[0]?.plan ?? "free")
  ));

  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("code, max_facilities, name")
    .in("code", planCodes);

  const limits = (plans ?? []).map((p) => p.max_facilities);
  if (limits.includes(null)) return { allowed: true };

  const maxLimit = Math.max(...limits.filter((l): l is number => l !== null), 1);
  if (count >= maxLimit) {
    const planName = plans?.[0]?.name ?? "your current";
    return {
      allowed: false,
      reason: `Your ${planName} plan allows up to ${maxLimit} facilit${maxLimit === 1 ? "y" : "ies"}. Upgrade to add more.`,
    };
  }
  return { allowed: true };
}
