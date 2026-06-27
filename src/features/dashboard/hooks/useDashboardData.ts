import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

export function useRoomCounts() {
  const { facility } = useFacility();
  return useQuery({
    queryKey: ["dashboard-rooms", facility?.id],
    enabled: !!facility,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("status")
        .eq("facility_id", facility!.id);
      if (error) throw error;
      const counts = { total: 0, available: 0, occupied: 0, dirty: 0, clean: 0, out_of_order: 0 };
      for (const r of data ?? []) {
        counts.total++;
        counts[r.status as keyof typeof counts]++;
      }
      return counts;
    },
  });
}

export function useTodayReservations() {
  const { facility } = useFacility();
  const d = today();
  return useQuery({
    queryKey: ["dashboard-reservations", facility?.id, d],
    enabled: !!facility,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, status, check_in, check_out, adults, children, total_amount, notes, room_id, guest:guests(full_name), room_type:room_types(name), room:rooms(name)")
        .eq("facility_id", facility!.id)
        .or(`check_in.eq.${d},check_out.eq.${d},status.eq.checked_in`);
      if (error) throw error;

      const arrivals = (data ?? []).filter(
        (r) => r.check_in === d && ["confirmed", "checked_in"].includes(r.status)
      );
      const departures = (data ?? []).filter(
        (r) => r.check_out === d && ["checked_in", "checked_out"].includes(r.status)
      );
      const inHouse = (data ?? []).filter((r) => r.status === "checked_in");

      return { arrivals, departures, inHouse, raw: data ?? [] };
    },
  });
}

export function useTodayRevenue() {
  const { facility } = useFacility();
  return useQuery({
    queryKey: ["dashboard-revenue", facility?.id, today()],
    enabled: !!facility,
    queryFn: async () => {
      const start = startOfDay(new Date()).toISOString();
      const end = endOfDay(new Date()).toISOString();
      const { data, error } = await supabase
        .from("payments")
        .select("amount")
        .eq("facility_id", facility!.id)
        .gte("created_at", start)
        .lte("created_at", end);
      if (error) throw error;
      return (data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    },
  });
}

export function useSetupCounts() {
  const { facility } = useFacility();
  return useQuery({
    queryKey: ["dashboard-setup", facility?.id],
    enabled: !!facility,
    queryFn: async () => {
      const fid = facility!.id;
      const [rt, rm, rp, mb, rv] = await Promise.all([
        supabase.from("room_types").select("id", { count: "exact", head: true }).eq("facility_id", fid),
        supabase.from("rooms").select("id", { count: "exact", head: true }).eq("facility_id", fid),
        supabase.from("rate_plans").select("id", { count: "exact", head: true }).eq("facility_id", fid),
        supabase.from("memberships").select("id", { count: "exact", head: true }).eq("facility_id", fid),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("facility_id", fid),
      ]);
      return {
        roomTypes: rt.count ?? 0,
        rooms: rm.count ?? 0,
        ratePlans: rp.count ?? 0,
        members: mb.count ?? 0,
        reservations: rv.count ?? 0,
      };
    },
  });
}

export function useOccupancyTrend() {
  const { facility } = useFacility();
  return useQuery({
    queryKey: ["dashboard-occupancy-trend", facility?.id],
    enabled: !!facility,
    queryFn: async () => {
      const fid = facility!.id;

      // Total rooms
      const { count: totalRooms } = await supabase
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("facility_id", fid);

      if (!totalRooms) return [];

      // Reservations active in the last 7 days
      const sevenAgo = format(subDays(new Date(), 6), "yyyy-MM-dd");
      const todayStr = today();
      const { data: reservations } = await supabase
        .from("reservations")
        .select("check_in, check_out, status")
        .eq("facility_id", fid)
        .in("status", ["confirmed", "checked_in", "checked_out"])
        .lte("check_in", todayStr)
        .gte("check_out", sevenAgo);

      const trend: { date: string; label: string; occupancy: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dStr = format(d, "yyyy-MM-dd");
        const label = format(d, "EEE");
        const occupied = (reservations ?? []).filter(
          (r) => r.check_in <= dStr && r.check_out > dStr
        ).length;
        trend.push({ date: dStr, label, occupancy: Math.round((occupied / totalRooms) * 100) });
      }
      return trend;
    },
  });
}

export function useQuickCheckIn() {
  const { facility } = useFacility();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reservationId, roomId }: { reservationId: string; roomId: string | null }) => {
      const { error: resErr } = await supabase
        .from("reservations")
        .update({ status: "checked_in" })
        .eq("id", reservationId);
      if (resErr) throw resErr;

      if (roomId) {
        await supabase.from("rooms").update({ status: "occupied" }).eq("id", roomId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-reservations", facility?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", facility?.id] });
    },
  });
}

export function useQuickCheckOut() {
  const { facility } = useFacility();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reservationId, roomId }: { reservationId: string; roomId: string | null }) => {
      const { error: resErr } = await supabase
        .from("reservations")
        .update({ status: "checked_out" })
        .eq("id", reservationId);
      if (resErr) throw resErr;

      if (roomId) {
        await supabase.from("rooms").update({ status: "dirty" }).eq("id", roomId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-reservations", facility?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", facility?.id] });
    },
  });
}
