import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Save, CheckCircle2, X, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/hooks/useSubscription";

const FEATURE_LABELS: { key: keyof SubscriptionPlan; label: string }[] = [
  { key: "feature_online_payments", label: "Online payments (Paystack)" },
  { key: "feature_ota_sync", label: "OTA channel sync" },
  { key: "feature_advanced_reports", label: "Advanced reports & analytics" },
  { key: "feature_guest_messaging", label: "Guest messaging & automations" },
  { key: "feature_custom_branding", label: "Custom branding" },
];

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async (plan: Partial<SubscriptionPlan> & { code: string }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ ...plan, updated_at: new Date().toISOString() })
        .eq("code", plan.code);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      qc.invalidateQueries({ queryKey: ["subscription-plans"] });
      setEditingCode(null);
      toast.success("Plan updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-sm text-muted-foreground">
          Edit pricing, limits, and features for each plan. Changes take effect immediately for new subscribers.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) =>
          editingCode === plan.code
            ? <PlanEditor key={plan.code} plan={plan} onSave={(updates) => updatePlan.mutate({ code: plan.code, ...updates })} onCancel={() => setEditingCode(null)} saving={updatePlan.isPending} />
            : <PlanCard key={plan.code} plan={plan} onEdit={() => setEditingCode(plan.code)} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Plan display card                                                  */
/* ------------------------------------------------------------------ */

function PlanCard({ plan, onEdit }: { plan: SubscriptionPlan; onEdit: () => void }) {
  return (
    <Card className={cn(
      "flex flex-col rounded-2xl p-5",
      plan.highlight ? "border-primary/40 bg-primary/[0.02]" : ""
    )}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold">{plan.name}</h3>
          {plan.highlight && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Popular</span>
          )}
        </div>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="mb-4 space-y-0.5">
        <p className="text-2xl font-bold tabular-nums">
          {plan.monthly_price === 0 ? "Free" : `₦${Number(plan.monthly_price).toLocaleString()}`}
          {plan.monthly_price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
        </p>
        {plan.annual_price > 0 && (
          <p className="text-xs text-muted-foreground">₦{Number(plan.annual_price).toLocaleString()}/yr</p>
        )}
      </div>

      <div className="mb-4 space-y-1 text-xs text-muted-foreground">
        <p>{plan.max_facilities === null ? "∞ facilities" : `${plan.max_facilities} facilit${plan.max_facilities === 1 ? "y" : "ies"}`}</p>
        <p>{plan.max_rooms === null ? "∞ rooms" : `${plan.max_rooms} rooms`}</p>
        <p>{plan.max_staff === null ? "∞ staff" : `${plan.max_staff} staff`}</p>
      </div>

      <ul className="mb-5 flex-1 space-y-1 text-xs">
        {FEATURE_LABELS.map(({ key, label }) => {
          const has = plan[key] as boolean;
          return (
            <li key={key as string} className={cn("flex items-center gap-1.5", !has && "text-muted-foreground/40")}>
              {has ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" /> : <X className="h-3 w-3 shrink-0" />}
              <span className={!has ? "line-through" : ""}>{label}</span>
            </li>
          );
        })}
      </ul>

      <Button size="sm" variant="outline" onClick={onEdit} className="w-full">Edit plan</Button>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Plan editor                                                        */
/* ------------------------------------------------------------------ */

function PlanEditor({
  plan, onSave, onCancel, saving,
}: {
  plan: SubscriptionPlan;
  onSave: (updates: Partial<SubscriptionPlan>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description ?? "",
    monthly_price: String(plan.monthly_price),
    annual_price: String(plan.annual_price),
    max_facilities: plan.max_facilities === null ? "" : String(plan.max_facilities),
    max_rooms: plan.max_rooms === null ? "" : String(plan.max_rooms),
    max_staff: plan.max_staff === null ? "" : String(plan.max_staff),
    feature_online_payments: plan.feature_online_payments,
    feature_ota_sync: plan.feature_ota_sync,
    feature_advanced_reports: plan.feature_advanced_reports,
    feature_guest_messaging: plan.feature_guest_messaging,
    feature_custom_branding: plan.feature_custom_branding,
    highlight: plan.highlight,
  });

  function handleSave() {
    onSave({
      name: form.name,
      description: form.description || null,
      monthly_price: Number(form.monthly_price) || 0,
      annual_price: Number(form.annual_price) || 0,
      max_facilities: form.max_facilities === "" ? null : Number(form.max_facilities),
      max_rooms: form.max_rooms === "" ? null : Number(form.max_rooms),
      max_staff: form.max_staff === "" ? null : Number(form.max_staff),
      feature_online_payments: form.feature_online_payments,
      feature_ota_sync: form.feature_ota_sync,
      feature_advanced_reports: form.feature_advanced_reports,
      feature_guest_messaging: form.feature_guest_messaging,
      feature_custom_branding: form.feature_custom_branding,
      highlight: form.highlight,
    });
  }

  return (
    <Card className="rounded-2xl border-primary/30 p-5 ring-1 ring-primary/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-sm">{plan.code.toUpperCase()}</h3>
        <button onClick={onCancel} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Plan name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-8 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Monthly price (₦)</Label>
            <Input type="number" min="0" value={form.monthly_price}
              onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
              className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Annual price (₦)</Label>
            <Input type="number" min="0" value={form.annual_price}
              onChange={(e) => setForm({ ...form, annual_price: e.target.value })}
              className="mt-1 h-8 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "max_facilities", label: "Facilities" },
            { key: "max_rooms", label: "Rooms" },
            { key: "max_staff", label: "Staff" },
          ].map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs">{label} <span className="text-muted-foreground">(blank=∞)</span></Label>
              <Input type="number" min="1"
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 h-8 text-sm"
                placeholder="∞"
              />
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          <p className="text-xs font-medium text-muted-foreground">Features</p>
          {FEATURE_LABELS.map(({ key, label }) => (
            <label key={key as string} className="flex cursor-pointer items-center gap-2.5 text-xs">
              <input
                type="checkbox"
                checked={(form as any)[key] as boolean}
                onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-input text-primary"
              />
              {label}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2.5 text-xs">
            <input
              type="checkbox"
              checked={form.highlight}
              onChange={(e) => setForm({ ...form, highlight: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-input text-primary"
            />
            Mark as "Most popular"
          </label>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1 gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </Card>
  );
}
