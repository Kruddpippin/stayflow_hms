import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  useAdminSubscriptions, useAdminFacilities, useUpsertSubscription,
  useCancelSubscription, useUpdateFacilityStatus, useAutoSuspendExpired,
} from "../hooks/useAdminData";
import { toast } from "sonner";
import {
  CreditCard, Search, Loader2, Plus, X, CheckCircle2, AlertTriangle, Ban, Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Plan config                                                        */
/* ------------------------------------------------------------------ */

const PLANS = [
  { value: "free",         label: "Free",         color: "bg-gray-100 text-gray-600" },
  { value: "starter",      label: "Starter",      color: "bg-blue-100 text-blue-700" },
  { value: "professional", label: "Professional", color: "bg-violet-100 text-violet-700" },
  { value: "enterprise",   label: "Enterprise",   color: "bg-amber-100 text-amber-800" },
];

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
  expired:   "bg-red-100 text-red-700",
  suspended: "bg-orange-100 text-orange-700",
};

const FAC_STATUS_BADGE: Record<string, string> = {
  active:    "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  setup:     "bg-gray-100 text-gray-600",
};

function planColor(plan: string) {
  return PLANS.find((p) => p.value === plan)?.color ?? "bg-gray-100 text-gray-600";
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminSubscriptionsPage() {
  const { data: subscriptions = [], isLoading: subsLoading } = useAdminSubscriptions();
  const { data: facilities = [], isLoading: facsLoading } = useAdminFacilities();
  const autoSuspend = useAutoSuspendExpired();

  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);   // facility_id being edited
  const [addingFor, setAddingFor] = useState<string | null>(null);   // facility_id getting new sub
  const [suspendDialog, setSuspendDialog] = useState<{ facilityId: string; name: string } | null>(null);

  // Facilities without subscriptions
  const subFacilityIds = new Set(subscriptions.map((s) => s.facility_id));
  const unsubscribed = facilities.filter((f) => !subFacilityIds.has(f.id));

  const filtered = subscriptions.filter((s) => {
    const matchSearch = !search ||
      s.facility_name.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || s.plan === filterPlan;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  async function handleAutoSuspend() {
    autoSuspend.mutate(undefined, {
      onSuccess: (count) => {
        if (count > 0) toast.success(`Auto-suspended ${count} expired facilit${count === 1 ? "y" : "ies"}.`);
        else toast.info("No expired facilities found.");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  const isLoading = subsLoading || facsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            {subscriptions.length} facilit{subscriptions.length !== 1 ? "ies" : "y"} with subscription records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleAutoSuspend}
            disabled={autoSuspend.isPending}
          >
            {autoSuspend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Auto-suspend expired
          </Button>
          {unsubscribed.length > 0 && (
            <Button className="gap-2" onClick={() => setAddingFor(unsubscribed[0].id)}>
              <Plus className="h-4 w-4" /> Add subscription
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by facility name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <NativeSelect value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)} className="w-44">
          <option value="all">All plans</option>
          {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </NativeSelect>
        <NativeSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-40">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </NativeSelect>
      </div>

      {/* Unsubscribed facilities notice */}
      {unsubscribed.length > 0 && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">
                {unsubscribed.length} facilit{unsubscribed.length !== 1 ? "ies" : "y"} without a subscription record
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unsubscribed.slice(0, 5).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setAddingFor(f.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50"
                  >
                    <Plus className="h-3 w-3" /> {f.name}
                  </button>
                ))}
                {unsubscribed.length > 5 && (
                  <span className="text-xs text-amber-700">+{unsubscribed.length - 5} more</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl p-12 text-center">
          <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No subscriptions match your filters.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-5 py-3 font-medium">Facility</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Sub status</th>
                <th className="px-5 py-3 font-medium">Facility status</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">End date</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium">{s.facility_name}</td>
                  <td className="px-5 py-3">
                    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", planColor(s.plan))}>
                      {PLANS.find((p) => p.value === s.plan)?.label ?? s.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_BADGE[s.status] ?? "bg-muted text-muted-foreground")}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", FAC_STATUS_BADGE[s.facility_status] ?? "bg-muted")}>
                      {s.facility_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {s.amount > 0 ? `₦${Number(s.amount).toLocaleString()}/${s.billing_interval === "annual" ? "yr" : "mo"}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {s.end_date ? (
                      <span className={new Date(s.end_date) < new Date() ? "text-red-600 font-medium" : ""}>
                        {new Date(s.end_date).toLocaleDateString()}
                      </span>
                    ) : "No expiry"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(s.facility_id)}>
                        Edit
                      </Button>
                      {s.facility_status === "active" ? (
                        <Button
                          size="sm" variant="outline"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setSuspendDialog({ facilityId: s.facility_id, name: s.facility_name })}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : s.facility_status === "suspended" ? (
                        <ReactivateButton facilityId={s.facility_id} />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit subscription dialog */}
      {editingId && (
        <SubscriptionDialog
          facilityId={editingId}
          existing={subscriptions.find((s) => s.facility_id === editingId) ?? null}
          onClose={() => setEditingId(null)}
        />
      )}

      {/* Add subscription dialog */}
      {addingFor && (
        <SubscriptionDialog
          facilityId={addingFor}
          existing={null}
          onClose={() => setAddingFor(null)}
        />
      )}

      {/* Suspend dialog */}
      {suspendDialog && (
        <SuspendDialog
          facilityId={suspendDialog.facilityId}
          facilityName={suspendDialog.name}
          onClose={() => setSuspendDialog(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reactivate button (inline)                                         */
/* ------------------------------------------------------------------ */

function ReactivateButton({ facilityId }: { facilityId: string }) {
  const updateStatus = useUpdateFacilityStatus();
  const upsertSub = useUpsertSubscription();

  function handleReactivate() {
    updateStatus.mutate({ id: facilityId, status: "active" }, {
      onSuccess: () => {
        upsertSub.mutate(
          { facility_id: facilityId, plan: "free", billing_interval: "monthly", amount: 0, start_date: new Date().toISOString().slice(0, 10), end_date: null, notes: "Reactivated by admin" },
          { onSuccess: () => toast.success("Facility reactivated."), onError: (e) => toast.error(e.message) }
        );
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <Button
      size="sm" variant="outline"
      className="text-green-600 hover:bg-green-50 hover:text-green-700"
      onClick={handleReactivate}
      disabled={updateStatus.isPending}
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Suspend dialog                                                     */
/* ------------------------------------------------------------------ */

function SuspendDialog({ facilityId, facilityName, onClose }: {
  facilityId: string; facilityName: string; onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const updateStatus = useUpdateFacilityStatus();
  const cancelSub = useCancelSubscription();

  function handleSuspend() {
    updateStatus.mutate({ id: facilityId, status: "suspended", reason: reason || undefined }, {
      onSuccess: () => {
        cancelSub.mutate(facilityId, {
          onSuccess: () => { toast.success(`${facilityName} suspended.`); onClose(); },
          onError: (e) => toast.error(e.message),
        });
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Suspend {facilityName}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          The facility will lose access immediately. Their subscription will be cancelled.
        </p>
        <div className="space-y-2 mb-5">
          <Label>Reason <span className="text-muted-foreground">(optional — visible to admin only)</span></Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Payment overdue, policy violation…"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={handleSuspend}
            disabled={updateStatus.isPending || cancelSub.isPending}
          >
            {(updateStatus.isPending || cancelSub.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Suspend facility
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit / Add subscription dialog                                     */
/* ------------------------------------------------------------------ */

function SubscriptionDialog({ facilityId, existing, onClose }: {
  facilityId: string;
  existing: { plan: string; billing_interval: string | null; amount: number; start_date: string; end_date: string | null; notes: string | null; facility_name: string } | null;
  onClose: () => void;
}) {
  const { data: facilities = [] } = useAdminFacilities();
  const facilityName = existing?.facility_name ?? facilities.find((f) => f.id === facilityId)?.name ?? "Facility";

  const [plan, setPlan] = useState(existing?.plan ?? "free");
  const [interval, setInterval] = useState(existing?.billing_interval ?? "monthly");
  const [amount, setAmount] = useState(String(existing?.amount ?? 0));
  const [startDate, setStartDate] = useState(existing?.start_date ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(existing?.end_date ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const upsert = useUpsertSubscription();

  function handleSave() {
    upsert.mutate({
      facility_id: facilityId,
      plan,
      billing_interval: interval,
      amount: Number(amount) || 0,
      start_date: startDate,
      end_date: endDate || null,
      notes: notes || null,
    }, {
      onSuccess: () => { toast.success("Subscription saved."); onClose(); },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold">{existing ? "Edit subscription" : "Add subscription"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{facilityName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <NativeSelect value={plan} onChange={(e) => setPlan(e.target.value)}>
                {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label>Billing interval</Label>
              <NativeSelect value={interval} onChange={(e) => setInterval(e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Amount (₦)</Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End date <span className="text-muted-foreground">(leave blank = no expiry)</span></Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground">(internal)</span></Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Payment reference, special terms…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save subscription
          </Button>
        </div>
      </div>
    </div>
  );
}
