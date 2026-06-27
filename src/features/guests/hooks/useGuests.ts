import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";

export interface GuestRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  id_document: string | null;
  nationality: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  stay_count: number;
  last_stay: string | null;
  total_spent: number;
}

export function useGuests() {
  const { facility } = useFacility();
  return useQuery<GuestRow[]>({
    queryKey: ["guests", facility?.id],
    enabled: !!facility,
    queryFn: async () => {
      const fid = facility!.id;

      const { data: guests, error } = await supabase
        .from("guests")
        .select("*")
        .eq("facility_id", fid)
        .order("full_name");
      if (error) throw error;

      // Fetch reservation counts + last stay per guest
      const { data: resSummary } = await supabase
        .from("reservations")
        .select("guest_id, check_out, status")
        .eq("facility_id", fid);

      // Fetch paid invoice totals per guest (via reservation)
      const { data: paidInvoices } = await supabase
        .from("invoices")
        .select("reservation_id, total, status")
        .eq("facility_id", fid)
        .eq("status", "paid");

      // Build reservation → guest map for invoices
      const { data: resGuests } = await supabase
        .from("reservations")
        .select("id, guest_id")
        .eq("facility_id", fid);

      const resGuestMap = new Map<string, string>();
      for (const r of resGuests ?? []) resGuestMap.set(r.id, r.guest_id);

      // Aggregate
      const stayMap = new Map<string, { count: number; lastStay: string | null }>();
      for (const r of resSummary ?? []) {
        const entry = stayMap.get(r.guest_id) ?? { count: 0, lastStay: null };
        entry.count++;
        if (!entry.lastStay || r.check_out > entry.lastStay) entry.lastStay = r.check_out;
        stayMap.set(r.guest_id, entry);
      }

      const spentMap = new Map<string, number>();
      for (const inv of paidInvoices ?? []) {
        const gid = resGuestMap.get(inv.reservation_id);
        if (gid) spentMap.set(gid, (spentMap.get(gid) ?? 0) + Number(inv.total));
      }

      return (guests ?? []).map((g) => {
        const stats = stayMap.get(g.id);
        return {
          ...g,
          tags: (g.tags as string[] | null) ?? [],
          stay_count: stats?.count ?? 0,
          last_stay: stats?.lastStay ?? null,
          total_spent: spentMap.get(g.id) ?? 0,
        };
      });
    },
  });
}

export function useGuest(guestId: string | undefined) {
  const { facility } = useFacility();
  return useQuery({
    queryKey: ["guest", facility?.id, guestId],
    enabled: !!facility && !!guestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("id", guestId!)
        .eq("facility_id", facility!.id)
        .single();
      if (error) throw error;
      return { ...data, tags: (data.tags as string[] | null) ?? [] };
    },
  });
}

export function useGuestReservations(guestId: string | undefined) {
  const { facility } = useFacility();
  return useQuery({
    queryKey: ["guest-reservations", facility?.id, guestId],
    enabled: !!facility && !!guestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, check_in, check_out, status, total_amount, adults, children, room_type:room_types(name), room:rooms(name)")
        .eq("facility_id", facility!.id)
        .eq("guest_id", guestId!)
        .order("check_in", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        room_type: r.room_type as unknown as { name: string } | null,
        room: r.room as unknown as { name: string } | null,
      }));
    },
  });
}

export function useGuestTotals(guestId: string | undefined) {
  const { facility } = useFacility();
  return useQuery({
    queryKey: ["guest-totals", facility?.id, guestId],
    enabled: !!facility && !!guestId,
    queryFn: async () => {
      const fid = facility!.id;
      const { data: reservations } = await supabase
        .from("reservations")
        .select("id, check_in, check_out")
        .eq("facility_id", fid)
        .eq("guest_id", guestId!);

      let stays = 0;
      let nights = 0;
      const resIds: string[] = [];
      for (const r of reservations ?? []) {
        stays++;
        resIds.push(r.id);
        const ci = new Date(r.check_in);
        const co = new Date(r.check_out);
        nights += Math.max(0, Math.ceil((co.getTime() - ci.getTime()) / 86400000));
      }

      let totalSpent = 0;
      if (resIds.length > 0) {
        const { data: invoices } = await supabase
          .from("invoices")
          .select("total")
          .eq("facility_id", fid)
          .eq("status", "paid")
          .in("reservation_id", resIds);
        for (const inv of invoices ?? []) totalSpent += Number(inv.total);
      }

      return { stays, nights, totalSpent };
    },
  });
}

export function useCreateGuest() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      full_name: string; email?: string; phone?: string;
      id_document?: string; nationality?: string; notes?: string; tags?: string[];
    }) => {
      const { data, error } = await supabase
        .from("guests")
        .insert({
          facility_id: facility!.id,
          full_name: payload.full_name,
          email: payload.email || null,
          phone: payload.phone || null,
          id_document: payload.id_document || null,
          nationality: payload.nationality || null,
          notes: payload.notes || null,
          tags: payload.tags ?? [],
        })
        .select("id, full_name")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guests", facility?.id] });
    },
  });
}

export function useUpdateGuest() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: {
      id: string; full_name?: string; email?: string | null; phone?: string | null;
      id_document?: string | null; nationality?: string | null; notes?: string | null; tags?: string[];
    }) => {
      const { error } = await supabase.from("guests").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["guests", facility?.id] });
      qc.invalidateQueries({ queryKey: ["guest", facility?.id, v.id] });
    },
  });
}

export function useDeleteGuest() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("guest_id", id);
      if (count && count > 0) throw new Error(`This guest has ${count} reservation(s) and cannot be deleted.`);
      const { error } = await supabase.from("guests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guests", facility?.id] });
    },
  });
}
