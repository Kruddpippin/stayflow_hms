import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import type { RoomStatus } from "@/types/db";

export interface RoomRow {
  id: string;
  name: string;
  floor: string | null;
  status: RoomStatus;
  room_type_id: string;
  facility_id: string;
  room_type: { id: string; name: string } | null;
}

export interface RoomTypeRow {
  id: string;
  name: string;
  base_rate: number;
  max_occupancy: number;
  total_units: number;
}

export function useRooms() {
  const { facility } = useFacility();
  return useQuery<RoomRow[]>({
    queryKey: ["rooms", facility?.id],
    enabled: !!facility,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, floor, status, room_type_id, facility_id, room_type:room_types(id, name)")
        .eq("facility_id", facility!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        room_type: r.room_type as unknown as { id: string; name: string } | null,
      }));
    },
  });
}

export function useRoomTypes() {
  const { facility } = useFacility();
  return useQuery<RoomTypeRow[]>({
    queryKey: ["room_types", facility?.id],
    enabled: !!facility,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_types")
        .select("id, name, base_rate, max_occupancy, total_units")
        .eq("facility_id", facility!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateRoom() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; floor?: string; room_type_id: string; status?: RoomStatus }) => {
      const { error } = await supabase.from("rooms").insert({
        facility_id: facility!.id,
        name: payload.name,
        floor: payload.floor || null,
        room_type_id: payload.room_type_id,
        status: payload.status ?? "available",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms", facility?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", facility?.id] });
    },
  });
}

export function useBulkCreateRooms() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rooms: { name: string; floor: string; room_type_id: string }[]) => {
      const { error } = await supabase.from("rooms").insert(
        rooms.map((r) => ({ ...r, facility_id: facility!.id, status: "available" as const }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms", facility?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", facility?.id] });
    },
  });
}

export function useUpdateRoom() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; floor?: string; room_type_id?: string; status?: RoomStatus }) => {
      const { error } = await supabase.from("rooms").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms", facility?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", facility?.id] });
    },
  });
}

export function useDeleteRoom() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms", facility?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", facility?.id] });
    },
  });
}

export function useChangeRoomStatus() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RoomStatus }) => {
      const { error } = await supabase.from("rooms").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["rooms", facility?.id] });
      const prev = qc.getQueryData<RoomRow[]>(["rooms", facility?.id]);
      qc.setQueryData<RoomRow[]>(["rooms", facility?.id], (old) =>
        old?.map((r) => (r.id === id ? { ...r, status } : r))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["rooms", facility?.id], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["rooms", facility?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", facility?.id] });
    },
  });
}
