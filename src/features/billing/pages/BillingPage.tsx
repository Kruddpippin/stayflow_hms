import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Zap, ArrowLeft, CheckCircle2, Building2, BedDouble, Users,
  CreditCard, MessageSquare, BarChart3, Globe, Palette, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Plan definitions                                                   */
/* ------------------------------------------------------------------ */

const PLANS = [
  {
    code: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    color: "bg-gray-50 border-gray-200",
    highlight: false,
    description: "Get started with the basics.",
    limits: { facilities: 1, rooms: 10, staff: 3 },
    features: [
      { label: "1 facility", icon: Building2 },
      { label: "10 rooms", icon: BedDouble },
      { label: "3 staff members", icon: Users },
      { label: "Reservations & invoices", icon: CreditCard },
    ],
    missing: ["Online payments", "OTA channel sync", "Advanced reports", "Custom branding"],
  },
  {
    code: "starter",
    name: "Starter",
    monthlyPrice: 15000,
    annualPrice: 150000,
    color: "bg-blue-50 border-blue-200",
    highlight: false,
    description: "For growing properties.",
    limits: { facilities: 3, rooms: 50, staff: 10 },
    features: [
      { label: "3 facilities", icon: Building2 },
      { label: "50 rooms", icon: BedDouble },
      { label: "10 staff members", icon: Users },
      { label: "Online payments (Paystack)", icon: CreditCard },
      { label: "Basic reports", icon: BarChart3 },
      { label: "Guest messaging", icon: MessageSquare },
    ],
    missing: ["OTA channel sync", "Custom branding"],
  },
  {
    code: "professional",
    name: "Professional",
    monthlyPrice: 35000,
    annualPrice: 350000,
    color: "bg-teal-50 border-teal-300",
    highlight: true,
    description: "For established hotel operations.",
    limits: { facilities: 10, rooms: 200, staff: -1 },
    features: [
      { label: "10 facilities", icon: Building2 },
      { label: "200 rooms", icon: BedDouble },
      { label: "Unlimited staff", icon: Users },
      { label: "Online payments", icon: CreditCard },
      { label: "Advanced reports & analytics", icon: BarChart3 },
      { label: "OTA channel sync", icon: Globe },
      { label: "Guest messaging", icon: MessageSquare },
    ],
    missing: ["Custom branding"],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    monthlyPrice: 80000,
    annualPrice: 800000,
    color: "bg-violet-50 border-violet-200",
    highlight: false,
    description: "For large groups and chains.",
    limits: { facilities: -1, rooms: -1, staff: -1 },
    features: [
      { label: "Unlimited facilities", icon: Building2 },
      { label: "Unlimited rooms", icon: BedDouble },
      { label: "Unlimited staff", icon: Users },
      { label: "Online payments", icon: CreditCard },
      { label: "Advanced reports & analytics", icon: BarChart3 },
      { label: "OTA channel sync", icon: Globe },
      { label: "Guest messaging & automations", icon: MessageSquare },
      { label: "Custom branding", icon: Palette },
    ],
    missing: [],
  },
];

function fmt(n: number) {
  return `₦${n.toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  const { user } = useAuth();
  const [yearly, setYearly] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<typeof PLANS[number] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [upgradeRequested, setUpgradeRequested] = useState<string | null>(null);

  // Fetch current subscription from facility_subscriptions via org
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
  const currentPlan = PLANS.find((p) => p.code === currentCode) ?? PLANS[0];

  async function handleRequestUpgrade(plan: typeof PLANS[number]) {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Record the upgrade request as a note on the subscription
      const interval = yearly ? "annual" : "monthly";
      const amount = yearly ? plan.annualPrice : plan.monthlyPrice;
      const { error } = await supabase.from("facility_subscriptions").upsert({
        facility_id: firstFacilityId,
        plan: plan.code,
        status: "active",
        billing_interval: interval,
        amount,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: yearly
          ? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
          : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        notes: `Upgrade requested by owner on ${new Date().toLocaleDateString()}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: "facility_id" });

      if (error) throw error;
      setUpgradeRequested(plan.code);
      setUpgradeTarget(null);
      toast.success(`Upgrade to ${plan.name} requested! The StayFlow team will activate it shortly.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit upgrade request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/account" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Billing & Plans</h1>
          <p className="text-sm text-muted-foreground">Manage your StayFlow subscription</p>
        </div>
      </div>

      {/* Current plan banner */}
      <Card className="rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="text-xl font-bold">{currentPlan.name}</h2>
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
                {fmt(Number(currentSub.amount))}/{currentSub.billing_interval === "annual" ? "yr" : "mo"}
                {currentSub.end_date && ` · renews ${new Date(currentSub.end_date).toLocaleDateString()}`}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Free forever — upgrade to unlock more</p>
            )}
          </div>
          {upgradeRequested && (
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Upgrade to {PLANS.find(p => p.code === upgradeRequested)?.name} requested
            </span>
          )}
        </div>
      </Card>

      {/* Billing interval toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Choose a plan</h2>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm", !yearly && "font-medium")}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              yearly ? "bg-primary" : "bg-muted"
            )}
          >
            <span className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              yearly ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
          <span className={cn("text-sm", yearly && "font-medium")}>
            Annual <span className="text-xs text-emerald-600 font-medium">save 2 months</span>
          </span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.code === currentCode;
          const price = yearly ? plan.annualPrice : plan.monthlyPrice;
          const perMonth = yearly && plan.monthlyPrice > 0 ? Math.round(plan.annualPrice / 12) : null;

          return (
            <div key={plan.code} className={cn(
              "relative flex flex-col rounded-2xl border-2 p-5 transition-all",
              plan.color,
              plan.highlight && "ring-2 ring-primary ring-offset-1",
              isCurrent && "opacity-80"
            )}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <h3 className="font-bold text-base">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-4">
                {price === 0 ? (
                  <p className="text-3xl font-bold">Free</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold">{fmt(price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {yearly ? "per year" : "per month"}
                      {perMonth && ` · ${fmt(perMonth)}/mo`}
                    </p>
                  </>
                )}
              </div>

              <ul className="mb-5 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {f.label}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground line-through">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>Current plan</Button>
              ) : plan.code === "free" ? (
                <Button variant="outline" className="w-full" disabled>Downgrade</Button>
              ) : (
                <Button
                  className={cn("w-full gap-1.5", plan.highlight ? "" : "variant-outline")}
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

      {/* Feature comparison note */}
      <Card className="rounded-2xl p-5 bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          All plans include reservations, invoicing, housekeeping, maintenance, front desk, and guest management.
          Upgrades are activated by the StayFlow team within 24 hours of your request.
        </p>
      </Card>

      {/* Upgrade confirm dialog */}
      {upgradeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setUpgradeTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Upgrade to {upgradeTarget.name}</h2>
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
                <span>{fmt(yearly ? upgradeTarget.annualPrice : upgradeTarget.monthlyPrice)}/{yearly ? "yr" : "mo"}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-5">
              Your upgrade request will be sent to the StayFlow team. You'll receive confirmation and payment instructions within 24 hours.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUpgradeTarget(null)}>Cancel</Button>
              <Button className="gap-2" onClick={() => handleRequestUpgrade(upgradeTarget)} disabled={submitting}>
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
