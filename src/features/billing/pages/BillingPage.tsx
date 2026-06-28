import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Zap, ArrowRight, Loader2,
  Building2, BedDouble, Users, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string; code: string; name: string; price_monthly: number;
  price_yearly: number; currency: string; limits: Record<string, number | null>;
  features: Record<string, boolean | string>;
}

interface Subscription {
  id: string; plan_id: string; status: string; interval: string;
  current_period_end: string | null; cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  plan: Plan | null;
}

interface SubInvoice {
  id: string; amount: number; currency: string; status: string;
  period_start: string; period_end: string; created_at: string;
}

export default function BillingPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Get org (user must be owner)
  const { data: org } = useQuery({
    queryKey: ["my-org", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name").eq("owner_id", user!.id).limit(1).single();
      return data;
    },
  });

  const { data: subscription } = useQuery<Subscription | null>({
    queryKey: ["subscription", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions")
        .select("id, plan_id, status, interval, current_period_end, cancel_at_period_end, trial_ends_at, plan:plans(*)")
        .eq("organization_id", org!.id).neq("status", "cancelled").single();
      if (!data) return null;
      return { ...data, plan: data.plan as unknown as Plan | null };
    },
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("price_monthly");
      return data ?? [];
    },
  });

  const { data: usage } = useQuery({
    queryKey: ["billing-usage", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_billing_summary", { p_org_id: org!.id });
      return (data as { usage: { facilities: number; rooms: number; staff: number } })?.usage;
    },
  });

  const { data: invoices = [] } = useQuery<SubInvoice[]>({
    queryKey: ["sub-invoices", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data } = await supabase.from("subscription_invoices")
        .select("*").eq("organization_id", org!.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const currentPlan = subscription?.plan;
  const currentCode = currentPlan?.code ?? "free";

  async function handleChangePlan(planCode: string) {
    if (!org) return;
    setProcessing(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          action: "subscribe", org_id: org.id, plan_code: planCode,
          interval: yearly ? "yearly" : "monthly",
          callback_url: window.location.href,
        }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.success("Plan updated!");
        qc.invalidateQueries({ queryKey: ["subscription"] });
        qc.invalidateQueries({ queryKey: ["billing-summary"] });
        setChangingPlan(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    if (!org || !window.confirm("Cancel your subscription? You'll keep access until the end of the billing period.")) return;
    setProcessing(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: "cancel", org_id: org.id }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      toast.success("Subscription will cancel at the end of the period.");
      qc.invalidateQueries({ queryKey: ["subscription"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setProcessing(false);
    }
  }

  const statusStyle: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700", trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-amber-100 text-amber-700", cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to="/account" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-xl font-semibold tracking-tight">Billing & Plans</h1>
      </div>

      {/* Current plan */}
      <Card className="rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{currentPlan?.name ?? "Free"} plan</h2>
              <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", statusStyle[subscription?.status ?? "active"])}>
                {subscription?.status ?? "active"}
              </span>
            </div>
            {subscription?.current_period_end && subscription.status !== "cancelled" && (
              <p className="mt-1 text-sm text-muted-foreground">
                {subscription.cancel_at_period_end ? "Cancels" : "Renews"} {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
              </p>
            )}
            {subscription?.trial_ends_at && subscription.status === "trialing" && (
              <p className="mt-1 text-sm text-blue-600">Trial ends {format(new Date(subscription.trial_ends_at), "MMM d, yyyy")}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setChangingPlan(!changingPlan)}>
              <Zap className="h-4 w-4" /> {changingPlan ? "Cancel" : currentCode === "free" ? "Upgrade" : "Change plan"}
            </Button>
            {currentCode !== "free" && !subscription?.cancel_at_period_end && (
              <Button variant="ghost" className="text-destructive" onClick={handleCancel} disabled={processing}>Cancel</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Usage */}
      {usage && currentPlan && (
        <Card className="rounded-2xl p-6">
          <h3 className="mb-4 text-sm font-semibold">Usage vs. limits</h3>
          <div className="space-y-3">
            <UsageBar icon={Building2} label="Facilities" current={usage.facilities} max={currentPlan.limits.max_facilities as number | null} />
            <UsageBar icon={BedDouble} label="Rooms" current={usage.rooms} max={currentPlan.limits.max_rooms as number | null} />
            <UsageBar icon={Users} label="Staff" current={usage.staff} max={currentPlan.limits.max_staff as number | null} />
          </div>
        </Card>
      )}

      {/* Change plan */}
      {changingPlan && (
        <Card className="rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Choose a plan</h3>
            <div className="flex rounded-full border p-0.5 text-xs">
              <button onClick={() => setYearly(false)} className={cn("rounded-full px-3 py-1", !yearly && "bg-primary text-primary-foreground")}>Monthly</button>
              <button onClick={() => setYearly(true)} className={cn("rounded-full px-3 py-1", yearly && "bg-primary text-primary-foreground")}>Yearly</button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => {
              const price = yearly ? p.price_yearly / 12 : p.price_monthly;
              const isCurrent = p.code === currentCode;
              return (
                <button key={p.id} onClick={() => setSelectedPlan(p.code)}
                  className={cn("rounded-xl border p-4 text-left transition-colors",
                    selectedPlan === p.code ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                    isCurrent && "opacity-50"
                  )} disabled={isCurrent}>
                  <p className="font-semibold">{p.name} {isCurrent && <span className="text-xs font-normal text-muted-foreground">(current)</span>}</p>
                  <p className="mt-1 text-lg font-bold">{price === 0 ? "Free" : `${p.currency} ${Math.round(price).toLocaleString()}/mo`}</p>
                </button>
              );
            })}
          </div>
          {selectedPlan && selectedPlan !== currentCode && (
            <Button className="mt-4 w-full gap-2" disabled={processing} onClick={() => handleChangePlan(selectedPlan)}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {selectedPlan === "free" ? "Downgrade to Free" : `Upgrade to ${plans.find((p) => p.code === selectedPlan)?.name}`}
            </Button>
          )}
        </Card>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card className="rounded-2xl p-0">
          <div className="border-b px-5 py-4"><h3 className="text-sm font-semibold">Billing history</h3></div>
          <div className="divide-y">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{inv.currency} {Number(inv.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(inv.created_at), "MMM d, yyyy")}</p>
                </div>
                <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium",
                  inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>{inv.status}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function UsageBar({ icon: Icon, label, current, max }: { icon: React.ElementType; label: string; current: number; max: number | null }) {
  const pct = max ? Math.min((current / max) * 100, 100) : 0;
  const nearLimit = max !== null && current >= max * 0.8;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {label}</span>
        <span className={cn("font-medium", nearLimit && "text-amber-600")}>{current} / {max ?? "∞"}</span>
      </div>
      {max !== null && (
        <div className="h-2 rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", nearLimit ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
