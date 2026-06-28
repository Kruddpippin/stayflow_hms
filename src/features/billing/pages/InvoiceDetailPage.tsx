import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Plus, Trash2, Loader2, AlertTriangle, FileText,
  Send, Ban, Printer, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import {
  useInvoice, useInvoiceItems, useInvoicePayments,
  useAddInvoiceItem, useRemoveInvoiceItem, useIssueInvoice,
  useVoidInvoice, useRecordPayment,
} from "../hooks/useInvoices";
import type { MembershipRole } from "@/types/db";

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  draft:  { label: "Draft",  cls: "bg-muted text-muted-foreground" },
  issued: { label: "Issued", cls: "bg-blue-100 text-blue-700" },
  paid:   { label: "Paid",   cls: "bg-emerald-100 text-emerald-700" },
  void:   { label: "Void",   cls: "bg-red-100 text-red-700" },
};

const CAN_VOID: MembershipRole[] = ["owner", "manager", "accountant"];

export default function InvoiceDetailPage() {
  return (
    <RoleGuard roles={["owner", "manager", "front_desk", "accountant"]}>
      <InvoiceDetailContent />
    </RoleGuard>
  );
}

function InvoiceDetailContent() {
  const { id, facilitySlug } = useParams<{ id: string; facilitySlug: string }>();
  const { facility, role } = useFacility();
  const slug = facilitySlug ?? facility?.slug ?? "";
  const currency = facility?.currency ?? "NGN";
  const canVoid = role ? CAN_VOID.includes(role) : false;

  const { data: inv, isLoading, isError } = useInvoice(id);
  const { data: items = [] } = useInvoiceItems(id);
  const { data: payments = [] } = useInvoicePayments(id);
  const removeItem = useRemoveInvoiceItem();
  const issueInv = useIssueInvoice();
  const voidInv = useVoidInvoice();

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const totalPaid = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const balance = inv ? Number(inv.total) - totalPaid : 0;
  const isVoid = inv?.status === "void";
  const isReadOnly = isVoid || inv?.status === "paid";

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }

  if (isError || !inv) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
        <Link to={`/app/${slug}/invoices`}><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
      </div>
    );
  }

  const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft;
  const guestName = inv.reservation?.guest?.full_name ?? "Guest";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to={`/app/${slug}/invoices`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Invoices
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{inv.number}</h1>
            <span className={cn("rounded-lg px-2.5 py-1 text-xs font-medium", st.cls)}>{st.label}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {guestName} · <Link to={`/app/${slug}/reservations/${inv.reservation_id}`} className="text-primary hover:underline">Reservation</Link>
            {inv.reservation && ` · ${format(new Date(inv.reservation.check_in), "MMM d")} → ${format(new Date(inv.reservation.check_out), "MMM d")}`}
          </p>
        </div>
        <div className="flex gap-2">
          {inv.status === "draft" && (
            <Button variant="outline" className="gap-2" disabled={issueInv.isPending}
              onClick={() => { issueInv.mutate(inv.id, { onSuccess: () => toast.success("Invoice issued."), onError: (e) => toast.error(e.message) }); }}>
              {issueInv.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Issue
            </Button>
          )}
          {!isReadOnly && (
            <Button className="gap-2" onClick={() => setPaymentOpen(true)}>
              <CreditCard className="h-4 w-4" /> Record payment
            </Button>
          )}
          {canVoid && !isVoid && inv.status !== "paid" && (
            <Button variant="ghost" size="icon" className="text-destructive"
              onClick={() => { if (window.confirm("Void this invoice? This cannot be undone.")) voidInv.mutate(inv.id, { onSuccess: () => toast.success("Invoice voided."), onError: (e) => toast.error(e.message) }); }}>
              <Ban className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => window.print()} title="Print"><Printer className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{currency} {Number(inv.total).toLocaleString()}</p>
        </Card>
        <Card className="rounded-2xl p-4 text-center">
          <p className="text-xs text-emerald-600">Paid</p>
          <p className="text-xl font-bold text-emerald-700">{currency} {totalPaid.toLocaleString()}</p>
        </Card>
        <Card className={cn("rounded-2xl p-4 text-center", balance > 0 && "border-amber-200 bg-amber-50/50")}>
          <p className="text-xs text-amber-600">Balance</p>
          <p className="text-xl font-bold text-amber-700">{currency} {balance.toLocaleString()}</p>
        </Card>
      </div>

      {/* Line items */}
      <Card className="rounded-2xl p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-sm font-semibold">Line items</h3>
          {!isReadOnly && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAddItemOpen(true)}>
              <Plus className="h-3 w-3" /> Add item
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-medium">Description</th>
                <th className="px-5 py-2 font-medium text-center">Qty</th>
                <th className="px-5 py-2 font-medium text-right">Unit price</th>
                <th className="px-5 py-2 font-medium text-right">Amount</th>
                {!isReadOnly && <th className="px-5 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">{it.description}</td>
                  <td className="px-5 py-3 text-center">{it.qty}</td>
                  <td className="px-5 py-3 text-right">{currency} {Number(it.unit_price).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-medium">{currency} {Number(it.amount).toLocaleString()}</td>
                  {!isReadOnly && (
                    <td className="px-5 py-3 text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        disabled={removeItem.isPending}
                        onClick={() => removeItem.mutate({ itemId: it.id, invoiceId: inv.id }, { onError: (e) => toast.error(e.message) })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No items yet.</td></tr>
              )}
            </tbody>
            <tfoot className="border-t bg-muted/30 text-sm">
              <tr><td colSpan={3} className="px-5 py-2 text-right text-muted-foreground">Subtotal</td><td className="px-5 py-2 text-right">{currency} {Number(inv.subtotal).toLocaleString()}</td>{!isReadOnly && <td />}</tr>
              <tr><td colSpan={3} className="px-5 py-2 text-right text-muted-foreground">Tax (7.5%)</td><td className="px-5 py-2 text-right">{currency} {Number(inv.tax).toLocaleString()}</td>{!isReadOnly && <td />}</tr>
              <tr className="font-semibold"><td colSpan={3} className="px-5 py-2 text-right">Total</td><td className="px-5 py-2 text-right">{currency} {Number(inv.total).toLocaleString()}</td>{!isReadOnly && <td />}</tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Payments */}
      <Card className="rounded-2xl p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-sm font-semibold">Payments</h3>
        </div>
        {payments.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No payments recorded.</div>
        ) : (
          <div className="divide-y">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium capitalize">{p.method.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy h:mm a")}{p.reference ? ` · ${p.reference}` : ""}</p>
                </div>
                <span className="font-semibold text-emerald-700">{currency} {Number(p.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add item dialog */}
      {addItemOpen && <AddItemDialog invoiceId={inv.id} currency={currency} onClose={() => setAddItemOpen(false)} />}

      {/* Record payment dialog */}
      {paymentOpen && <RecordPaymentDialog invoiceId={inv.id} balance={balance} currency={currency} onClose={() => setPaymentOpen(false)} />}
    </div>
  );
}

/* ---- Add item dialog ---- */

function AddItemDialog({ invoiceId, currency, onClose }: { invoiceId: string; currency: string; onClose: () => void }) {
  const addItem = useAddInvoiceItem();
  const [desc, setDesc] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) { toast.error("Description is required."); return; }
    if (!price || Number(price) <= 0) { toast.error("Price must be greater than 0."); return; }
    try {
      await addItem.mutateAsync({ invoice_id: invoiceId, description: desc, qty: Number(qty) || 1, unit_price: Number(price) });
      toast.success("Item added.");
      onClose();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed."); }
  }

  return (
    <DialogShell title="Add line item" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label>Description *</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Room: Deluxe x 3 nights" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Qty</Label><Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div className="space-y-2"><Label>Unit price ({currency})</Label><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={addItem.isPending} className="gap-2">{addItem.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Add</Button>
        </div>
      </form>
    </DialogShell>
  );
}

/* ---- Record payment dialog (shared component) ---- */

export function RecordPaymentDialog({ invoiceId, balance, currency, defaultAmount, onClose, onSuccess }: {
  invoiceId: string; balance: number; currency: string; defaultAmount?: number; onClose: () => void; onSuccess?: () => void;
}) {
  const record = useRecordPayment();
  const [amount, setAmount] = useState(String(defaultAmount ?? Math.max(balance, 0)));
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");

  const numAmount = Number(amount) || 0;
  const afterBalance = balance - numAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (numAmount <= 0) { toast.error("Amount must be greater than 0."); return; }
    try {
      await record.mutateAsync({ invoice_id: invoiceId, amount: numAmount, method, reference: reference || undefined });
      toast.success("Payment recorded.");
      onSuccess?.();
      onClose();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed."); }
  }

  return (
    <DialogShell title="Record payment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Balance due</span>
          <span className="font-semibold">{currency} {balance.toLocaleString()}</span>
        </div>
        <div className="space-y-2">
          <Label>Amount ({currency}) *</Label>
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Method</Label>
            <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
              <option value="pos">POS</option>
              <option value="other">Other</option>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ID / POS slip" />
          </div>
        </div>
        {numAmount > 0 && (
          <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">After payment</span><span className={cn("font-semibold", afterBalance <= 0 ? "text-emerald-700" : "text-amber-700")}>{currency} {afterBalance.toLocaleString()}</span></div>
            {afterBalance <= 0 && <p className="mt-1 text-xs text-emerald-600">Invoice will be marked as paid.</p>}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={record.isPending} className="gap-2">{record.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Record payment</Button>
        </div>
      </form>
    </DialogShell>
  );
}

/* ---- Dialog shell ---- */

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><FileText className="h-4 w-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
