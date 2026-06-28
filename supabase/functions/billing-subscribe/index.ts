// Edge Function: initialize/change/cancel subscription
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBillingProvider } from "../_shared/billing-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, org_id, plan_code, interval, callback_url } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get org + billing info
    const { data: org } = await supabase.from("organizations").select("id, name, owner_id").eq("id", org_id).single();
    if (!org) throw new Error("Organization not found");

    // Get owner email
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", org.owner_id).single();
    const { data: authUser } = await supabase.auth.admin.getUserById(org.owner_id);
    const email = authUser?.user?.email ?? "";

    const providerCode = Deno.env.get("PAYSTACK_SECRET_KEY") ? "paystack" : "mock";
    const provider = getBillingProvider(providerCode);

    if (action === "subscribe" || action === "change") {
      const { data: plan } = await supabase.from("plans").select("*").eq("code", plan_code).single();
      if (!plan) throw new Error("Plan not found");

      const amount = interval === "yearly" ? plan.price_yearly : plan.price_monthly;

      if (plan.code === "free") {
        // Downgrade to free — cancel existing, create free sub
        const { data: existingSub } = await supabase.from("subscriptions")
          .select("id, external_subscription_id").eq("organization_id", org_id).neq("status", "cancelled").single();
        if (existingSub?.external_subscription_id) {
          await provider.cancelSubscription(existingSub.external_subscription_id);
        }
        if (existingSub) {
          await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", existingSub.id);
        }
        await supabase.from("subscriptions").insert({
          organization_id: org_id, plan_id: plan.id, status: "active",
          interval: "monthly", current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 100 * 365 * 86400000).toISOString(),
        });
        return new Response(JSON.stringify({ success: true, plan: "free" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Paid plan — initialize payment
      const result = await provider.createSubscription({
        org_id, plan_code, interval: interval ?? "monthly", amount, email,
        callback_url,
      });

      if (!result.success) throw new Error(result.error);

      // Store pending subscription reference for webhook processing
      // Upsert org billing
      await supabase.from("organization_billing").upsert({
        organization_id: org_id,
        provider_id: (await supabase.from("billing_providers").select("id").eq("code", providerCode).single()).data?.id,
        billing_email: email,
      }, { onConflict: "organization_id" });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "cancel") {
      const { data: sub } = await supabase.from("subscriptions")
        .select("id, external_subscription_id, current_period_end")
        .eq("organization_id", org_id).neq("status", "cancelled").single();
      if (!sub) throw new Error("No active subscription");

      await supabase.from("subscriptions").update({
        cancel_at_period_end: true,
      }).eq("id", sub.id);

      if (sub.external_subscription_id) {
        await provider.cancelSubscription(sub.external_subscription_id, true);
      }

      return new Response(JSON.stringify({ success: true, cancel_at: sub.current_period_end }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "verify") {
      const { reference } = await req.json();
      // Verify payment and activate subscription
      // For Paystack: verify transaction, then activate
      if (providerCode === "paystack") {
        const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;
        const resp = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${paystackKey}` },
        });
        const psData = await resp.json();
        if (psData.data?.status === "success") {
          const metadata = psData.data.metadata;
          const { data: plan } = await supabase.from("plans").select("id").eq("code", metadata.plan_code).single();
          if (plan) {
            // Cancel existing, create new
            await supabase.from("subscriptions").update({ status: "cancelled" })
              .eq("organization_id", org_id).neq("status", "cancelled");

            const periodEnd = metadata.interval === "yearly"
              ? new Date(Date.now() + 365 * 86400000) : new Date(Date.now() + 30 * 86400000);

            await supabase.from("subscriptions").insert({
              organization_id: org_id, plan_id: plan.id,
              external_subscription_id: reference,
              status: "active", interval: metadata.interval ?? "monthly",
              current_period_start: new Date().toISOString(),
              current_period_end: periodEnd.toISOString(),
            });
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
