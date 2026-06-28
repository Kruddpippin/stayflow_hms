import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";

interface PlanInfo {
  plan_code: string;
  plan_name: string;
  limits: { max_facilities: number | null; max_rooms: number | null; max_staff: number | null };
  features: { ota_sync: boolean; public_booking_engine: boolean; online_payments: boolean; reports: string; branding: boolean };
  status: string;
  interval?: string;
  current_period_end?: string;
  trial_ends_at?: string | null;
  cancel_at_period_end?: boolean;
}

interface Usage {
  facilities: number;
  rooms: number;
  staff: number;
}

interface BillingSummary {
  plan: PlanInfo;
  usage: Usage;
}

export function usePlan() {
  const { facility } = useFacility();

  const { data, isLoading } = useQuery<BillingSummary | null>({
    queryKey: ["billing-summary", facility?.organization_id],
    enabled: !!facility?.organization_id,
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_billing_summary", {
        p_org_id: facility!.organization_id,
      });
      if (error) return null;
      return data as BillingSummary;
    },
  });

  const plan = data?.plan ?? null;
  const usage = data?.usage ?? { facilities: 0, rooms: 0, staff: 0 };

  function can(action: string): { allowed: boolean; reason?: string; upgrade_to?: string } {
    if (!plan) return { allowed: true };

    const limits = plan.limits;
    const features = plan.features;

    switch (action) {
      case "create_facility":
        if (limits.max_facilities !== null && usage.facilities >= limits.max_facilities)
          return { allowed: false, reason: `Facility limit (${limits.max_facilities})`, upgrade_to: "pro" };
        break;
      case "add_room":
        if (limits.max_rooms !== null && usage.rooms >= limits.max_rooms)
          return { allowed: false, reason: `Room limit (${limits.max_rooms})`, upgrade_to: "pro" };
        break;
      case "invite_staff":
        if (limits.max_staff !== null && usage.staff >= limits.max_staff)
          return { allowed: false, reason: `Staff limit (${limits.max_staff})`, upgrade_to: "pro" };
        break;
      case "enable_ota_sync":
        if (!features.ota_sync) return { allowed: false, reason: "Requires Pro or Business", upgrade_to: "pro" };
        break;
      case "enable_online_payments":
        if (!features.online_payments) return { allowed: false, reason: "Requires Starter+", upgrade_to: "starter" };
        break;
      case "enable_custom_branding":
        if (!features.branding) return { allowed: false, reason: "Requires Starter+", upgrade_to: "starter" };
        break;
      case "view_advanced_reports":
        if (features.reports !== "advanced") return { allowed: false, reason: "Requires Pro+", upgrade_to: "pro" };
        break;
    }
    return { allowed: true };
  }

  return { plan, usage, loading: isLoading, can };
}
