import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";

export interface InvoiceListRow {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  created_at: string;
  reservation: { id: string; check_in: string; check_out: string; guest: { full_name: string } | null } | null;
  paid: number;
  balance: number;
}

export interface InvoiceDetail {
  id: string;
  facility_id: string;
  reservation_id: string;
  number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  created_at: string;
  reservation: { id: string; check_in: string; check_out: string; guest_id: string; guest: { full_name: string; email: string | null } | null } | null;
}

export interface InvoiceItemRow {
  id: string;
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
}

export interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  created_at: string;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, fid?: string) {
  qc.invalidateQueries({ queryKey: ["invoices", fid] });
  qc.invalidateQueries({ queryKey: ["invoice"] });
  qc.invalidateQueries({ queryKey: ["invoice-items"] });
  qc.invalidateQueries({ queryKey: ["invoice-payments"] });
  qc.invalidateQueries({ queryKey: ["dashboard-revenue", fid] });
}

export function useInvoices() {
  const { facility } = useFacility();
  return useQuery<InvoiceListRow[]>({
    queryKey: ["invoices", facility?.id],
    staleTime: 60_000,
    enabled: !!facility,
    queryFn: async () => {
      const fid = facility!.id;
      const { data, error } = await supabase
        .from("invoices")
        .select("id, number, status, subtotal, tax, total, currency, created_at, reservation:reservations(id, check_in, check_out, guest:guests(full_name))")
        .eq("facility_id", fid)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get payments totals per invoice
      const { data: payments } = await supabase
        .from("payments")
        .select("invoice_id, amount")
        .eq("facility_id", fid);

      const paidMap = new Map<string, number>();
      for (const p of payments ?? []) paidMap.set(p.invoice_id, (paidMap.get(p.invoice_id) ?? 0) + Number(p.amount));

      return (data ?? []).map((inv) => {
        const paid = paidMap.get(inv.id) ?? 0;
        return {
          ...inv,
          reservation: inv.reservation as unknown as InvoiceListRow["reservation"],
          paid,
          balance: Number(inv.total) - paid,
        };
      });
    },
  });
}

export function useInvoice(id: string | undefined) {
  const { facility } = useFacility();
  return useQuery<InvoiceDetail>({
    queryKey: ["invoice", facility?.id, id],
    staleTime: 60_000,
    enabled: !!facility && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, reservation:reservations(id, check_in, check_out, guest_id, guest:guests(full_name, email))")
        .eq("id", id!)
        .eq("facility_id", facility!.id)
        .single();
      if (error) throw error;
      return { ...data, reservation: data.reservation as unknown as InvoiceDetail["reservation"] };
    },
  });
}

export function useInvoiceItems(invoiceId: string | undefined) {
  const { facility } = useFacility();
  return useQuery<InvoiceItemRow[]>({
    queryKey: ["invoice-items", facility?.id, invoiceId],
    staleTime: 60_000,
    enabled: !!facility && !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("id, description, qty, unit_price, amount")
        .eq("invoice_id", invoiceId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvoicePayments(invoiceId: string | undefined) {
  const { facility } = useFacility();
  return useQuery<PaymentRow[]>({
    queryKey: ["invoice-payments", facility?.id, invoiceId],
    staleTime: 60_000,
    enabled: !!facility && !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, method, reference, created_at")
        .eq("invoice_id", invoiceId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateInvoice() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { reservation_id: string; items?: { description: string; qty: number; unit_price: number }[] }) => {
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({ facility_id: facility!.id, reservation_id: params.reservation_id, number: 'DRAFT', status: 'draft', subtotal: 0, tax: 0, total: 0, currency: facility!.currency })
        .select("id")
        .single();
      if (invErr) throw invErr;

      if (params.items?.length) {
        const rows = params.items.map((it) => ({
          facility_id: facility!.id, invoice_id: inv.id,
          description: it.description, qty: it.qty, unit_price: it.unit_price,
          amount: it.qty * it.unit_price,
        }));
        await supabase.from("invoice_items").insert(rows);
        await supabase.rpc("recompute_invoice_totals", { p_invoice_id: inv.id });
      }
      return inv;
    },
    onSuccess: () => invalidateAll(qc, facility?.id),
  });
}

export function useAddInvoiceItem() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { invoice_id: string; description: string; qty: number; unit_price: number }) => {
      const { error } = await supabase.from("invoice_items").insert({
        facility_id: facility!.id, invoice_id: params.invoice_id,
        description: params.description, qty: params.qty,
        unit_price: params.unit_price, amount: params.qty * params.unit_price,
      });
      if (error) throw error;
      await supabase.rpc("recompute_invoice_totals", { p_invoice_id: params.invoice_id });
    },
    onSuccess: () => invalidateAll(qc, facility?.id),
  });
}

export function useRemoveInvoiceItem() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, invoiceId }: { itemId: string; invoiceId: string }) => {
      const { error } = await supabase.from("invoice_items").delete().eq("id", itemId);
      if (error) throw error;
      await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoiceId });
    },
    onSuccess: () => invalidateAll(qc, facility?.id),
  });
}

export function useIssueInvoice() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.rpc("issue_invoice", { p_invoice_id: invoiceId });
      if (error) throw error;
      const result = data as Record<string, unknown>;
      if (result.error) throw new Error(result.error as string);
      return result;
    },
    onSuccess: () => invalidateAll(qc, facility?.id),
  });
}

export function useVoidInvoice() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase.from("invoices").update({ status: "void" }).eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc, facility?.id),
  });
}

export function useRecordPayment() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { invoice_id: string; amount: number; method: string; reference?: string }) => {
      const { error } = await supabase.from("payments").insert({
        facility_id: facility!.id, invoice_id: params.invoice_id,
        amount: params.amount, method: params.method as "cash" | "card" | "transfer" | "pos" | "other",
        reference: params.reference || null,
      });
      if (error) throw error;
      await supabase.rpc("recompute_invoice_totals", { p_invoice_id: params.invoice_id });
    },
    onSuccess: () => invalidateAll(qc, facility?.id),
  });
}
