import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Search, FileText, AlertTriangle, Banknote } from "lucide-react";
import { useInvoices } from "../hooks/useInvoices";

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  draft:  { label: "Draft",  cls: "bg-muted text-muted-foreground" },
  issued: { label: "Issued", cls: "bg-blue-100 text-blue-700" },
  paid:   { label: "Paid",   cls: "bg-emerald-100 text-emerald-700" },
  void:   { label: "Void",   cls: "bg-red-100 text-red-700 line-through" },
};

export default function InvoicesPage() {
  return (
    <RoleGuard roles={["owner", "manager", "front_desk", "accountant"]}>
      <InvoicesContent />
    </RoleGuard>
  );
}

function InvoicesContent() {
  const { facility } = useFacility();
  const slug = facility?.slug ?? "";
  const currency = facility?.currency ?? "NGN";
  const { data: invoices = [], isLoading, isError, refetch } = useInvoices();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.number.toLowerCase().includes(q) ||
        (i.reservation?.guest?.full_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, search, statusFilter]);

  const totalOutstanding = useMemo(
    () => invoices.filter((i) => i.status !== "void" && i.status !== "paid").reduce((s, i) => s + i.balance, 0),
    [invoices]
  );

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load invoices.</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        </div>
        {totalOutstanding > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm">
            <Banknote className="h-4 w-4 text-amber-600" />
            <span className="text-amber-800">Outstanding: <strong>{currency} {totalOutstanding.toLocaleString()}</strong></span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by number or guest…" className="h-9 pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-auto min-w-[120px] text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </NativeSelect>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No invoices yet — they're created from reservations.</p>
        </div>
      ) : (
        <Card className="rounded-2xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Stay</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((inv) => {
                  const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft;
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link to={`/app/${slug}/invoices/${inv.id}`} className="font-medium text-primary hover:underline">{inv.number}</Link>
                      </td>
                      <td className="px-4 py-3">{inv.reservation?.guest?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {inv.reservation ? `${format(new Date(inv.reservation.check_in), "MMM d")} → ${format(new Date(inv.reservation.check_out), "MMM d")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{currency} {Number(inv.total).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{inv.paid > 0 ? `${currency} ${inv.paid.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{inv.balance > 0 ? `${currency} ${inv.balance.toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3"><span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", st.cls)}>{st.label}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{format(new Date(inv.created_at), "MMM d, yyyy")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No invoices match your filters.</div>}
        </Card>
      )}
    </div>
  );
}
