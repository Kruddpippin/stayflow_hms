import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";

export function useReservation(id: string | undefined) {
  const { facility } = useFacility();
  return useQuery({
    queryKey: ["reservation", facility?.id, id],
    enabled: !!facility && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, guest:guests(id, full_name, email, phone), room_type:room_types(id, name, base_rate, max_occupancy), room:rooms(id, name)")
        .eq("id", id!)
        .eq("facility_id", facility!.id)
        .single();
      if (error) throw error;
      return {
        ...data,
        guest: data.guest as unknown as { id: string; full_name: string; email: string | null; phone: string | null } | null,
        room_type: data.room_type as unknown as { id: string; name: string; base_rate: number; max_occupancy: number } | null,
        room: data.room as unknown as { id: string; name: string } | null,
      };
    },
  });
}

export function useAvailableRooms(roomTypeId: string | null, checkIn: string, checkOut: string, excludeReservationId?: string) {
  const { facility } = useFacility();
  return useQuery({
    queryKey: ["available-rooms", facility?.id, roomTypeId, checkIn, checkOut, excludeReservationId],
    enabled: !!facility && !!roomTypeId && !!checkIn && !!checkOut && checkOut > checkIn,
    queryFn: async () => {
      const fid = facility!.id;

      // All rooms of this type
      const { data: allRooms } = await supabase
        .from("rooms")
        .select("id, name, floor, status")
        .eq("facility_id", fid)
        .eq("room_type_id", roomTypeId!)
        .order("name");

      // Reservations overlapping the date range
      const { data: overlapping } = await supabase
        .from("reservations")
        .select("room_id")
        .eq("facility_id", fid)
        .in("status", ["confirmed", "checked_in"])
        .lt("check_in", checkOut)
        .gt("check_out", checkIn)
        .not("room_id", "is", null);

      const bookedIds = new Set(
        (overlapping ?? [])
          .filter((r) => !excludeReservationId || r.room_id !== excludeReservationId)
          .map((r) => r.room_id)
      );

      const rooms = (allRooms ?? []).filter(
        (r) => r.status !== "out_of_order" && !bookedIds.has(r.id)
      );

      return { available: rooms, total: allRooms?.length ?? 0 };
    },
  });
}

function rpcMutation(qc: ReturnType<typeof useQueryClient>, facilityId: string | undefined) {
  return {
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservation"] });
      qc.invalidateQueries({ queryKey: ["reservations", facilityId] });
      qc.invalidateQueries({ queryKey: ["dashboard-reservations", facilityId] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", facilityId] });
      qc.invalidateQueries({ queryKey: ["rooms", facilityId] });
      qc.invalidateQueries({ queryKey: ["available-rooms"] });
      qc.invalidateQueries({ queryKey: ["housekeeping", facilityId] });
    },
  };
}

async function callRpc(name: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  const result = data as Record<string, unknown>;
  if (result.error) throw new Error(result.error as string);
  return result;
}

export function useCheckIn() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, roomId }: { reservationId: string; roomId?: string }) =>
      callRpc("reservation_check_in", { p_reservation_id: reservationId, p_room_id: roomId ?? null }),
    ...rpcMutation(qc, facility?.id),
  });
}

export function useCheckOut() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) =>
      callRpc("reservation_check_out", { p_reservation_id: reservationId }),
    ...rpcMutation(qc, facility?.id),
  });
}

export function useCancel() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, reason }: { reservationId: string; reason?: string }) =>
      callRpc("reservation_cancel", { p_reservation_id: reservationId, p_reason: reason ?? null }),
    ...rpcMutation(qc, facility?.id),
  });
}

export function useNoShow() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reservationId: string) =>
      callRpc("reservation_no_show", { p_reservation_id: reservationId }),
    ...rpcMutation(qc, facility?.id),
  });
}

export function useAssignRoom() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reservationId, roomId }: { reservationId: string; roomId: string }) =>
      callRpc("reservation_assign_room", { p_reservation_id: reservationId, p_room_id: roomId }),
    ...rpcMutation(qc, facility?.id),
  });
}

export function useSaveReservation() {
  const { facility } = useFacility();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id?: string;
      guest_id: string;
      room_type_id: string;
      room_id: string | null;
      check_in: string;
      check_out: string;
      status?: string;
      source: string;
      adults: number;
      children: number;
      total_amount: number;
      notes: string | null;
    }) => {
      const { data, error } = await supabase.rpc("upsert_reservation", {
        p_id: params.id ?? null,
        p_facility_id: facility!.id,
        p_guest_id: params.guest_id,
        p_room_type_id: params.room_type_id,
        p_room_id: params.room_id,
        p_check_in: params.check_in,
        p_check_out: params.check_out,
        p_status: params.status ?? "confirmed",
        p_source: params.source,
        p_adults: params.adults,
        p_children: params.children,
        p_total_amount: params.total_amount,
        p_notes: params.notes,
      });

      if (error) throw error;
      const result = data as Record<string, unknown>;
      if (result.error) throw new Error(result.error as string);
      return result as { id: string };
    },
    onSuccess: () => {
      const fid = facility?.id;
      qc.invalidateQueries({ queryKey: ["reservations", fid] });
      qc.invalidateQueries({ queryKey: ["dashboard-reservations", fid] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", fid] });
      qc.invalidateQueries({ queryKey: ["available-rooms"] });
      qc.invalidateQueries({ queryKey: ["guests", fid] });
    },
  });
}
