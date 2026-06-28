// Edge Function: billing provider webhook (Paystack/Stripe)
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBillingProvider } from "../_shared/billing-provider.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.text();
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
    const provider = getBillingProvider(secret ? "paystack" : "mock");

    // Verify signature
    const valid = await provider.verifyWebhook(req.headers, body, secret);
    if (!valid && secret) return new Response("Invalid signature", { status: 401 });

    const event = JSON.parse(body);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get provider ID
    const { data: bp } = await supabase.from("billing_providers").select("id").eq("code", provider.name).single();

    // Idempotency: store raw event
    const eventId = event.id ?? event.data?.reference ?? `${Date.now()}`;
    const { error: dupErr } = await supabase.from("billing_events_raw").insert({
      provider_id: bp?.id,
      event_type: event.event ?? "unknown",
      provider_event_id: eventId,
      payload: event,
      signature_ok: valid,
    });
    if (dupErr?.code === "23505") return new Response("Already processed", { status: 200 });

    // Process
    const processed = await provider.processWebhookEvent(event);
    if (processed?.type === "subscription_paid" && processed.subscription_ref) {
      // Find the org by the metadata in the payment reference
      const metadata = (event.data as Record<string, unknown>)?.metadata as Record<string, unknown> | undefined;
      const orgId = metadata?.org_id as string;
      const planCode = metadata?.plan_code as string;
      const interval = (metadata?.interval as string) ?? "monthly";

      if (orgId && planCode) {
        const { data: plan } = await supabase.from("plans").select("id").eq("code", planCode).single();
        if (plan) {
          // Cancel existing non-cancelled subs
          await supabase.from("subscriptions").update({ status: "cancelled" })
            .eq("organization_id", orgId).neq("status", "cancelled");

          const periodEnd = interval === "yearly"
            ? new Date(Date.now() + 365 * 86400000) : new Date(Date.now() + 30 * 86400000);

          await supabase.from("subscriptions").insert({
            organization_id: orgId, plan_id: plan.id,
            external_subscription_id: processed.subscription_ref,
            status: "active", interval,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
          });

          // Create subscription invoice
          await supabase.from("subscription_invoices").insert({
            organization_id: orgId, amount: processed.amount ?? 0,
            currency: "NGN", status: "paid",
            period_start: new Date().toISOString(),
            period_end: periodEnd.toISOString(),
            provider_invoice_ref: processed.subscription_ref,
          });
        }
      }
    }

    // Mark processed
    await supabase.from("billing_events_raw").update({ processed: true })
      .eq("provider_event_id", eventId);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Billing webhook error:", err);
    return new Response("Error", { status: 500 });
  }
});
