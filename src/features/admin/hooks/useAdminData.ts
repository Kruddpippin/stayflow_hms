import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { FacilityStatus } from "@/types/db";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [profiles, orgs, facilities, reservations] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id, status", { count: "exact" }),
        supabase.from("reservations").select("id, total_amount"),
      ]);

      const facilityList = facilities.data ?? [];
      const active = facilityList.filter((f) => f.status === "active").length;
      const suspended = facilityList.filter((f) => f.status === "suspended").length;
      const setup = facilityList.filter((f) => f.status === "setup").length;

      const totalRevenue = (reservations.data ?? []).reduce(
        (sum, r) => sum + Number(r.total_amount ?? 0), 0
      );

      return {
        totalUsers: profiles.count ?? 0,
        totalOrgs: orgs.count ?? 0,
        totalFacilities: facilities.count ?? 0,
        activeFacilities: active,
        suspendedFacilities: suspended,
        setupFacilities: setup,
        totalReservations: reservations.data?.length ?? 0,
        totalRevenue,
      };
    },
  });
}

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
          reservations(id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((f) => ({
        ...f,
        org_name: (f.organization as any)?.name ?? "—",
        owner_id: (f.organization as any)?.owner_id ?? null,
        member_count: (f.memberships as any[])?.length ?? 0,
        room_count: (f.rooms as any[])?.length ?? 0,
        reservation_count: (f.reservations as any[])?.length ?? 0,
      }));
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, platform_role, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: memberships } = await supabase
        .from("memberships")
        .select("user_id, role, facility:facilities(name)");

      const memberMap = new Map<string, { role: string; facility_name: string }[]>();
      for (const m of memberships ?? []) {
        const list = memberMap.get(m.user_id) ?? [];
        list.push({
          role: m.role,
          facility_name: (m.facility as any)?.name ?? "—",
        });
        memberMap.set(m.user_id, list);
      }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("owner_id, name");

      const orgMap = new Map<string, string[]>();
      for (const o of orgData ?? []) {
        const list = orgMap.get(o.owner_id) ?? [];
        list.push(o.name);
        orgMap.set(o.owner_id, list);
      }

      return (profiles ?? []).map((p) => ({
        ...p,
        memberships: memberMap.get(p.id) ?? [],
        organizations: orgMap.get(p.id) ?? [],
      }));
    },
  });
}

export function useUpdateFacilityStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FacilityStatus }) => {
      const { error } = await supabase
        .from("facilities")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useUpdatePlatformRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "user" | "admin" }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ platform_role: role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
