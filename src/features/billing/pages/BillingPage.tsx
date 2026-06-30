import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSubscriptionPlans, type SubscriptionPlan } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Zap, ArrowLeft, CheckCircle2, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";

function fmt(n: number) {
  return `₦${Number(n).toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Segmented toggle                                                    */
/* ------------------------------------------------------------------ */

function BillingToggle({ yearly, onChange }: { yearly: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex items-center gap-3">
      <div className="relative inline-flex rounded-full bg-muted p-1">
        {/* Sliding pill */}
        <div
          className={cn(
            "absolute top-1 bottom-1 rounded-full bg-primary transition-all duration-300 ease-[cubic-bezier(0.34,1.26,0.64,1)]",
            yearly ? "left-[calc(50%+2px)] right-1" : "left-1 right-[calc(50%+2px)]"
          )}
        />
        <button
          onClick={() => onChange(false)}
          className={cn(
            "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 min-w-[80px]",
            !yearly ? "text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => onChange(true)}
          className={cn(
            "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 min-w-[80px]",
            yearly ? "text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Annual
        </button>
      </div>
      {yearly && (
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          Save 2 months
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  const { user } = useAuth();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const [yearly, setYearly] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<SubscriptionPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [upgradeRequested, setUpgradeRequested] = useState<string | null>(null);

  const { data: org } = useQuery({
    queryKey: ["my-org", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, facilities(id)")
        .eq("owner_id", user!.id)
        .limit(1)
        .single();
      return data;
    },
  });

  const firstFacilityId = (org?.facilities as any[])?.[0]?.id ?? null;

  const { data: currentSub } = useQuery({
    queryKey: ["facility-sub-billing", firstFacilityId],
    enabled: !!firstFacilityId,
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_subscriptions")
        .select("plan, status, amount, billing_interval, end_date")
        .eq("facility_id", firstFacilityId)
        .maybeSingle();
      return data;
    },
  });

  const currentCode = currentSub?.plan ?? "free";
  const currentPlan = plans.find((p) => p.code === currentCode);

  async function handleRequestUpgrade(plan: SubscriptionPlan) {
    if (submitting || !firstFacilityId) return;
    setSubmitting(true);
    try {
      const interval = yearly ? "annual" : "monthly";
      const amount = yearly ? plan.annual_price : plan.monthly_price;
      const endDate = yearly
        ? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
        : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const { error } = await supabase.from("facility_subscriptions").upsert({
        facility_id: firstFacilityId,
        plan: plan.code,
        status: "active",
        billing_interval: interval,
        amount,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: endDate,
        notes: `Upgrade requested by owner on ${new Date().toLocaleDateString()}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: "facility_id" });

      if (error) throw error;
      setUpgradeRequested(plan.code);
      setUpgradeTarget(null);
      toast.success(`Upgrade to ${plan.name} requested. The StayFlow team will activate it within 24 hours.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit upgrade request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (plansLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/account" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">Billing &amp; Plans</h1>
          <p className="text-sm text-muted-foreground">Manage your StayFlow subscription</p>
        </div>
      </div>

      {/* Current plan */}
      <Card className="rounded-2xl p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current plan</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold">{currentPlan?.name ?? "Free"}</h2>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium",
                currentSub?.status === "active" ? "bg-emerald-100 text-emerald-700" :
                currentSub?.status === "expired" ? "bg-red-100 text-red-700" :
                "bg-gray-100 text-gray-600"
              )}>
                {currentSub?.status ?? "active"}
              </span>
            </div>
            {currentCode !== "free" && currentSub?.amount ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {fmt(Number(currentSub.amount))}/{currentSub.billing_interval === "annual" ? "year" : "month"}
                {currentSub.end_date && ` · renews ${new Date(currentSub.end_date).toLocaleDateString()}`}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Free plan · upgrade to unlock more capacity</p>
            )}
          </div>
          {upgradeRequested && (
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Upgrade to {plans.find(p => p.code === upgradeRequested)?.name} requested
            </span>
          )}
        </div>
      </Card>

      {/* Toggle + heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">Choose a plan</h2>
        <BillingToggle yearly={yearly} onChange={setYearly} />
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentCode;
          const price = yearly ? plan.annual_price : plan.monthly_price;
          const monthlyEquiv = yearly && plan.monthly_price > 0
            ? Math.round(plan.annual_price / 12)
            : null;

          return (
            <div key={plan.code} className={cn(
              "card-lift relative flex flex-col rounded-2xl border-2 p-5 transition-all",
              plan.highlight
                ? "border-primary bg-primary/[0.02]"
                : isCurrent
                  ? "border-border/80 bg-muted/30"
                  : "border-border bg-card",
              plan.highlight && "ring-2 ring-primary/20 ring-offset-2"
            )}>
              {plan.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white whitespace-nowrap">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <h3 className="font-display font-bold text-base">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-5">
                {price === 0 ? (
                  <p className="stat-value text-3xl">Free</p>
                ) : (
                  <>
                    <p className="stat-value text-2xl">{fmt(price)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {yearly ? `per year · ${fmt(monthlyEquiv!)}/mo` : "per month"}
                    </p>
                  </>
                )}
              </div>

              {/* Limits */}
              <div className="mb-4 space-y-1 text-xs text-muted-foreground">
                <p>{plan.max_facilities === null ? "Unlimited facilities" : `Up to ${plan.max_facilities} facilit${plan.max_facilities === 1 ? "y" : "ies"}`}</p>
                <p>{plan.max_rooms === null ? "Unlimited rooms" : `Up to ${plan.max_rooms} rooms`}</p>
                <p>{plan.max_staff === null ? "Unlimited staff" : `Up to ${plan.max_staff} staff`}</p>
              </div>

              {/* Features */}
              <ul className="mb-5 flex-1 space-y-1.5 text-xs">
                {[
                  { key: "feature_online_payments", label: "Online payments" },
                  { key: "feature_ota_sync", label: "OTA channel sync" },
                  { key: "feature_advanced_reports", label: "Advanced reports" },
                  { key: "feature_guest_messaging", label: "Guest messaging" },
                  { key: "feature_custom_branding", label: "Custom branding" },
                ].map(({ key, label }) => {
                  const has = (plan as any)[key] as boolean;
                  return (
                    <li key={key} className={cn("flex items-center gap-1.5", !has && "text-muted-foreground/50")}>
                      {has
                        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        : <X className="h-3.5 w-3.5 shrink-0" />}
                      <span className={has ? "" : "line-through"}>{label}</span>
                    </li>
                  );
                })}
              </ul>

              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>Current plan</Button>
              ) : plan.code === "free" ? (
                <Button variant="outline" className="w-full text-muted-foreground" disabled>Downgrade</Button>
              ) : (
                <Button
                  className={cn("w-full btn-glow gap-1.5", !plan.highlight && "variant-outline")}
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => setUpgradeTarget(plan)}
                >
                  <Zap className="h-3.5 w-3.5" /> Upgrade
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Card className="rounded-2xl bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        All plans include reservations, rooms, invoicing, housekeeping, maintenance, front desk, and guest management.
        Upgrades are activated by the StayFlow team within 24 hours.
      </Card>

      {/* Upgrade confirm dialog */}
      {upgradeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setUpgradeTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold">Upgrade to {upgradeTarget.name}</h2>
              <button onClick={() => setUpgradeTarget(null)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-xl bg-muted/40 p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{upgradeTarget.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Billing</span>
                <span className="font-medium">{yearly ? "Annual" : "Monthly"}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>Total</span>
                <span>{fmt(yearly ? upgradeTarget.annual_price : upgradeTarget.monthly_price)}/{yearly ? "yr" : "mo"}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Your upgrade request will be sent to the StayFlow team. You'll be contacted with payment instructions within 24 hours.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUpgradeTarget(null)}>Cancel</Button>
              <Button className="btn-glow gap-2" onClick={() => handleRequestUpgrade(upgradeTarget)} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Request upgrade
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
