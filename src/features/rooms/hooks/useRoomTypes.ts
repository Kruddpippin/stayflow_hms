import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";

/* ---- Room types ---- */

export interface RoomTypeDetail {
  id: string;
  name: string;
  description: string | null;
  base_rate: number;
  max_occupancy: number;
  total_units: number;
  photos: string[];
  roomCount: number;
}

export function useRoomTypesDetail() {
  const { facility } = useFacility();
  return useQuery<RoomTypeDetail[]>({
    queryKey: ["room_types_detail", facility?.id],
    enabled: !!facility,
    queryFn: async () => {
      const fid = facility!.id;
      const { data: types, error } = await supabase
        .from("room_types")
        .select("id, name, description, base_rate, max_occupancy, total_units, photos")
        .eq("facility_id", fid)
        .order("name");
      if (error) throw error;

      // Count rooms per type in one query
      const { data: rooms } = await supabase
        .from("rooms")
        .select("room_type_id")
        .eq("facility_id", fid);

      const countMap = new Map<string, number>();
      for (const r of rooms ?? []) {
        countMap.set(r.room_type_id, (countMap.get(r.room_type_id) ?? 0) + 1);
      }

      return (types ?? []).map((t) => ({
        ...t,
        photos: (t.photos as string[] | null) ?? [],
        roomCount: countMap.get(t.id) ?? 0,
      }));
    },
  });
}

export function useCreateRoomType() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string; description?: string; base_rate: number;
      max_occupancy: number; total_units: number; photos?: string[];
    }) => {
      const { data, error } = await supabase
        .from("room_types")
        .insert({
          facility_id: facility!.id,
          name: payload.name,
          description: payload.description || null,
          base_rate: payload.base_rate,
          max_occupancy: payload.max_occupancy,
          total_units: payload.total_units,
          photos: payload.photos ?? [],
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateAll(qc, facility?.id),
  });
}

export function useUpdateRoomType() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string; name?: string; description?: string; base_rate?: number;
      max_occupancy?: number; total_units?: number; photos?: string[];
    }) => {
      const { error } = await supabase.from("room_types").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc, facility?.id),
  });
}

export function useDeleteRoomType() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Check for rooms
      const { count: roomCount } = await supabase
        .from("rooms").select("id", { count: "exact", head: true }).eq("room_type_id", id);
      if (roomCount && roomCount > 0) {
        throw new Error(`This type has ${roomCount} room(s). Reassign or delete them first.`);
      }
      // Check for reservations
      const { count: resCount } = await supabase
        .from("reservations").select("id", { count: "exact", head: true }).eq("room_type_id", id);
      if (resCount && resCount > 0) {
        throw new Error(`This type has ${resCount} reservation(s) and cannot be deleted.`);
      }
      const { error } = await supabase.from("room_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc, facility?.id),
  });
}

/* ---- Rate plans ---- */

export interface RatePlanRow {
  id: string;
  name: string;
  price: number;
  conditions: Record<string, unknown>;
}

export function useRatePlans(roomTypeId: string | null) {
  const { facility } = useFacility();
  return useQuery<RatePlanRow[]>({
    queryKey: ["rate_plans", facility?.id, roomTypeId],
    enabled: !!facility && !!roomTypeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_plans")
        .select("id, name, price, conditions")
        .eq("facility_id", facility!.id)
        .eq("room_type_id", roomTypeId!)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, conditions: (r.conditions ?? {}) as Record<string, unknown> }));
    },
  });
}

export function useCreateRatePlan() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      room_type_id: string; name: string; price: number; conditions: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from("rate_plans").insert({
        facility_id: facility!.id, ...payload,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["rate_plans", facility?.id, v.room_type_id] });
      qc.invalidateQueries({ queryKey: ["dashboard-setup", facility?.id] });
    },
  });
}

export function useUpdateRatePlan() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, room_type_id, ...payload }: {
      id: string; room_type_id: string; name?: string; price?: number; conditions?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from("rate_plans").update(payload).eq("id", id);
      if (error) throw error;
      return { room_type_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["rate_plans", facility?.id, d.room_type_id] });
    },
  });
}

export function useDeleteRatePlan() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, room_type_id }: { id: string; room_type_id: string }) => {
      const { error } = await supabase.from("rate_plans").delete().eq("id", id);
      if (error) throw error;
      return { room_type_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["rate_plans", facility?.id, d.room_type_id] });
      qc.invalidateQueries({ queryKey: ["dashboard-setup", facility?.id] });
    },
  });
}

/* ---- Shared invalidation ---- */

function invalidateAll(qc: ReturnType<typeof useQueryClient>, facilityId?: string) {
  qc.invalidateQueries({ queryKey: ["room_types_detail", facilityId] });
  qc.invalidateQueries({ queryKey: ["room_types", facilityId] });
  qc.invalidateQueries({ queryKey: ["dashboard-setup", facilityId] });
}
