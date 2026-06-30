import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { FacilityStatus } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Stats                                                              */
/* ------------------------------------------------------------------ */

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [profiles, orgs, facilities, reservations, subs] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id, status", { count: "exact" }),
        supabase.from("reservations").select("id, total_amount"),
        supabase.from("facility_subscriptions").select("id, plan, status"),
      ]);

      const facilityList = facilities.data ?? [];
      const subList = subs.data ?? [];

      return {
        totalUsers: profiles.count ?? 0,
        totalOrgs: orgs.count ?? 0,
        totalFacilities: facilities.count ?? 0,
        activeFacilities: facilityList.filter((f) => f.status === "active").length,
        suspendedFacilities: facilityList.filter((f) => f.status === "suspended").length,
        setupFacilities: facilityList.filter((f) => f.status === "setup").length,
        totalReservations: reservations.data?.length ?? 0,
        totalRevenue: (reservations.data ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
        paidSubscriptions: subList.filter((s) => s.plan !== "free" && s.status === "active").length,
        expiredSubscriptions: subList.filter((s) => s.status === "expired").length,
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Facilities                                                         */
/* ------------------------------------------------------------------ */

export function useAdminFacilities() {
  return useQuery({
    queryKey: ["admin", "facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select(`
          id, name, slug, type, status, currency, city, country, created_at,
          organization:organizations(name, owner_id),
          memberships(id),
          rooms(id),
          reservations(id),
          facility_subscriptions(plan, status, end_date)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((f) => {
        const sub = (f.facility_subscriptions as any[])?.[0] ?? null;
        return {
          ...f,
          org_name: (f.organization as any)?.name ?? "—",
          owner_id: (f.organization as any)?.owner_id ?? null,
          member_count: (f.memberships as any[])?.length ?? 0,
          room_count: (f.rooms as any[])?.length ?? 0,
          reservation_count: (f.reservations as any[])?.length ?? 0,
          sub_plan: sub?.plan ?? null,
          sub_status: sub?.status ?? null,
          sub_end_date: sub?.end_date ?? null,
        };
      });
    },
  });
}

export function useUpdateFacilityStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: FacilityStatus; reason?: string }) => {
      const { error } = await supabase.from("facilities").update({ status }).eq("id", id);
      if (error) throw error;
      if (reason) {
        await supabase.from("facility_subscriptions")
          .update({ suspended_reason: reason, updated_at: new Date().toISOString() })
          .eq("facility_id", id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useDeleteFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_facility", { p_facility_id: id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  platform_role: string;
  created_at: string;
  category: "platform_admin" | "facility_owner";
  organizations: string[];
  facilities: { name: string; status: string; logo_url: string | null; room_count: number; reservation_count: number }[];
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [{ data: orgData }, { data: adminProfiles }] = await Promise.all([
        supabase.from("organizations").select("owner_id, name, facilities(id, name, status, logo_url, rooms(id), reservations(id))"),
        supabase.from("profiles").select("id, full_name, phone, platform_role, created_at").eq("platform_role", "admin"),
      ]);

      // Build owner map with richer facility details
      const ownerMap = new Map<string, {
        orgs: string[];
        facilities: { name: string; status: string; logo_url: string | null; room_count: number; reservation_count: number }[];
      }>();
      for (const o of orgData ?? []) {
        const entry = ownerMap.get(o.owner_id) ?? { orgs: [], facilities: [] };
        entry.orgs.push(o.name);
        for (const f of (o.facilities as any[]) ?? []) {
          entry.facilities.push({
            name: f.name,
            status: f.status,
            logo_url: f.logo_url ?? null,
            room_count: (f.rooms as any[])?.length ?? 0,
            reservation_count: (f.reservations as any[])?.length ?? 0,
          });
        }
        ownerMap.set(o.owner_id, entry);
      }

      const ownerIds = Array.from(ownerMap.keys());
      const { data: ownerProfiles } = ownerIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, phone, platform_role, created_at").in("id", ownerIds)
        : { data: [] };

      // Merge: admins first, then owners (deduplicated)
      const allProfiles = [...(adminProfiles ?? []), ...(ownerProfiles ?? [])];
      const allIds = allProfiles.map((p) => p.id);

      // Fetch emails via admin function
      const { data: emailRows } = allIds.length > 0
        ? await supabase.rpc("admin_get_user_emails", { user_ids: allIds })
        : { data: [] };
      const emailMap = new Map<string, string>();
      for (const r of emailRows ?? []) emailMap.set(r.id, r.email);

      const seen = new Set<string>();
      const result: AdminUser[] = [];

      for (const p of adminProfiles ?? []) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        result.push({
          ...p,
          email: emailMap.get(p.id) ?? null,
          category: "platform_admin",
          organizations: ownerMap.get(p.id)?.orgs ?? [],
          facilities: ownerMap.get(p.id)?.facilities ?? [],
        });
      }

      for (const p of ownerProfiles ?? []) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        result.push({
          ...p,
          email: emailMap.get(p.id) ?? null,
          category: "facility_owner",
          organizations: ownerMap.get(p.id)?.orgs ?? [],
          facilities: ownerMap.get(p.id)?.facilities ?? [],
        });
      }

      return result.sort((a, b) => {
        if (a.category !== b.category) return a.category === "platform_admin" ? -1 : 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    },
  });
}

export function useUpdatePlatformRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "user" | "admin" }) => {
      const { error } = await supabase.from("profiles").update({ platform_role: role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_delete_user_data", { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

/* ------------------------------------------------------------------ */
/*  Subscriptions                                                      */
/* ------------------------------------------------------------------ */

export interface AdminSubscription {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_status: string;
  plan: string;
  status: string;
  billing_interval: string | null;
  amount: number;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_subscriptions")
        .select(`
          id, facility_id, plan, status, billing_interval, amount,
          start_date, end_date, notes, suspended_reason, created_at, updated_at,
          facility:facilities(name, status)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((s) => ({
        ...s,
        facility_name: (s.facility as any)?.name ?? "—",
        facility_status: (s.facility as any)?.status ?? "unknown",
      })) as AdminSubscription[];
    },
  });
}

export function useUpsertSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sub: {
      facility_id: string;
      plan: string;
      billing_interval: string;
      amount: number;
      start_date: string;
      end_date: string | null;
      notes: string | null;
    }) => {
      const { error } = await supabase
        .from("facility_subscriptions")
        .upsert({ ...sub, status: "active", updated_at: new Date().toISOString() }, { onConflict: "facility_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (facilityId: string) => {
      const { error } = await supabase
        .from("facility_subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("facility_id", facilityId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useAutoSuspendExpired() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_suspend_expired_facilities");
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}
