// Supabase Edge Function: verify a Paystack payment after redirect
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { reference, booking_reference } = await req.json();
    if (!reference || !booking_reference) throw new Error("Missing reference");

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) throw new Error("Paystack not configured");

    // Verify with Paystack
    const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    });
    const psData = await resp.json();

    if (!psData.status || psData.data.status !== "success") {
      return new Response(JSON.stringify({
        verified: false,
        status: psData.data?.status || "failed",
        message: "Payment was not successful.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const amount = psData.data.amount / 100; // kobo → naira
    const method = psData.data.channel === "card" ? "card"
      : psData.data.channel === "bank" || psData.data.channel === "bank_transfer" ? "transfer"
      : "other";

    // Record via the idempotent RPC
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: result, error } = await supabase.rpc("record_verified_payment", {
      p_booking_reference: booking_reference,
      p_amount: amount,
      p_method: method,
      p_provider_ref: reference,
      p_provider: "paystack",
    });
    if (error) throw error;

    return new Response(JSON.stringify({ verified: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
