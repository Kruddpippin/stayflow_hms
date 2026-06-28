import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Search, Download, Banknote, AlertTriangle, CreditCard } from "lucide-react";

interface PaymentLedgerRow {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  created_at: string;
  received_by: string | null;
  invoice: { id: string; number: string; reservation: { guest: { full_name: string } | null } | null } | null;
  receiver: { full_name: string | null } | null;
}

const METHODS = ["cash", "card", "transfer", "pos", "other"];

export default function PaymentsPage() {
  return (
    <RoleGuard roles={["owner", "manager", "front_desk", "accountant"]}>
      <PaymentsContent />
    </RoleGuard>
  );
}

function PaymentsContent() {
  const { facility } = useFacility();
  const slug = facility?.slug ?? "";
  const currency = facility?.currency ?? "NGN";
  const fid = facility?.id;

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const { data: payments = [], isLoading, isError, refetch } = useQuery<PaymentLedgerRow[]>({
    queryKey: ["payments-ledger", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, method, reference, created_at, received_by, invoice:invoices(id, number, reservation:reservations(guest:guests(full_name))), receiver:profiles!payments_received_by_fkey(full_name)")
        .eq("facility_id", fid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        invoice: p.invoice as unknown as PaymentLedgerRow["invoice"],
        receiver: p.receiver as unknown as PaymentLedgerRow["receiver"],
      }));
    },
  });

  const filtered = useMemo(() => {
    let list = payments;
    if (methodFilter) list = list.filter((p) => p.method === methodFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        (p.invoice?.number ?? "").toLowerCase().includes(q) ||
        (p.invoice?.reservation?.guest?.full_name ?? "").toLowerCase().includes(q) ||
        (p.reference ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [payments, search, methodFilter]);

  const totalReceived = useMemo(() => filtered.reduce((s, p) => s + Number(p.amount), 0), [filtered]);

  function exportCsv() {
    const header = "Date,Guest,Invoice,Amount,Method,Reference,Received By\n";
    const rows = filtered.map((p) =>
      `"${format(new Date(p.created_at), "yyyy-MM-dd HH:mm")}","${p.invoice?.reservation?.guest?.full_name ?? ""}","${p.invoice?.number ?? ""}",${p.amount},"${p.method}","${p.reference ?? ""}","${p.receiver?.full_name ?? ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load payments.</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">{payments.length} payment{payments.length !== 1 ? "s" : ""} recorded</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm">
          <Banknote className="h-4 w-4 text-emerald-600" />
          <span className="text-emerald-800">Total: <strong>{currency} {totalReceived.toLocaleString()}</strong></span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by guest, invoice, or reference…" className="h-9 pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-auto min-w-[120px] text-sm" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          <option value="">All methods</option>
          {METHODS.map((m) => <option key={m} value={m} className="capitalize">{m}</option>)}
        </NativeSelect>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <CreditCard className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        </div>
      ) : (
        <Card className="rounded-2xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Received by</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(p.created_at), "MMM d, h:mm a")}</td>
                    <td className="px-4 py-3">{p.invoice?.reservation?.guest?.full_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {p.invoice ? <Link to={`/app/${slug}/invoices/${p.invoice.id}`} className="text-primary hover:underline">{p.invoice.number}</Link> : "—"}
                    </td>
                    <td className={cn("px-4 py-3 text-right font-medium", Number(p.amount) < 0 ? "text-destructive" : "text-emerald-700")}>
                      {Number(p.amount) < 0 ? "−" : ""}{currency} {Math.abs(Number(p.amount)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 capitalize">{p.method.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.receiver?.full_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No payments match your filters.</div>}
        </Card>
      )}
    </div>
  );
}
