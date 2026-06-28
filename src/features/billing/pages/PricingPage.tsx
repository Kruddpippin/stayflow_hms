import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Hotel, Check, ArrowRight } from "lucide-react";

interface Plan {
  id: string; code: string; name: string; price_monthly: number;
  price_yearly: number; currency: string; limits: Record<string, unknown>;
  features: Record<string, unknown>;
}

const FEATURE_LABELS: Record<string, string> = {
  public_booking_engine: "Public booking engine",
  online_payments: "Online payments",
  ota_sync: "OTA / Channel sync",
  branding: "Custom branding",
};

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("price_monthly");
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel className="h-[18px] w-[18px]" />
            </div>
            <span className="text-base font-bold">StayFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost">Log in</Button></Link>
            <Link to="/signup"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Start free, upgrade as you grow. No hidden fees.</p>

          <div className="mt-6 inline-flex items-center rounded-full border p-1">
            <button onClick={() => setYearly(false)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                !yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}>Monthly</button>
            <button onClick={() => setYearly(true)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}>Yearly <span className="ml-1 text-xs text-emerald-600">Save 20%</span></button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const price = yearly ? plan.price_yearly / 12 : plan.price_monthly;
            const isPopular = plan.code === "pro";
            const limits = plan.limits as Record<string, number | null>;
            const features = plan.features as Record<string, boolean | string>;

            return (
              <Card key={plan.id} className={cn("relative flex flex-col rounded-2xl p-6",
                isPopular && "border-primary ring-2 ring-primary/20"
              )}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most popular
                  </div>
                )}

                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2">
                  {price === 0 ? (
                    <p className="text-3xl font-bold">Free</p>
                  ) : (
                    <p className="text-3xl font-bold">
                      {plan.currency} {Math.round(price).toLocaleString()}
                      <span className="text-base font-normal text-muted-foreground">/mo</span>
                    </p>
                  )}
                  {yearly && price > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {plan.currency} {plan.price_yearly.toLocaleString()} billed yearly
                    </p>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    {limits.max_facilities ? `${limits.max_facilities} facilit${limits.max_facilities > 1 ? "ies" : "y"}` : "Unlimited facilities"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    {limits.max_rooms ? `${limits.max_rooms} rooms` : "Unlimited rooms"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    {limits.max_staff ? `${limits.max_staff} staff` : "Unlimited staff"}
                  </li>
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                    <li key={key} className={cn("flex items-center gap-2", !features[key] && "text-muted-foreground line-through")}>
                      <Check className={cn("h-4 w-4", features[key] ? "text-emerald-600" : "text-muted-foreground/30")} />
                      {label}
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    {features.reports === "advanced" ? "Advanced reports" : features.reports === "standard" ? "Standard reports" : "Basic reports"}
                  </li>
                </ul>

                <Link to={plan.code === "free" ? "/signup" : "/signup"} className="mt-6">
                  <Button className={cn("w-full gap-2", isPopular && "bg-primary")} variant={isPopular ? "default" : "outline"}>
                    {plan.code === "free" ? "Start free" : "Get started"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} StayFlow. All rights reserved.
      </footer>
    </div>
  );
}
