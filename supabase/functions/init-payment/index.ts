// Supabase Edge Function: initialize a Paystack/Stripe payment
// Env: PAYSTACK_SECRET_KEY, STRIPE_SECRET_KEY (optional), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { booking_reference, email, amount_override, callback_url } = await req.json();
    if (!booking_reference || !email) throw new Error("Missing booking_reference or email");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up booking via the secure RPC
    const { data: booking, error: bErr } = await supabase.rpc("get_guest_booking", {
      p_reference: booking_reference, p_email: email,
    });
    if (bErr) throw bErr;
    if (booking.error) throw new Error(booking.error);

    const balance = Number(booking.balance);
    if (balance <= 0) {
      return new Response(JSON.stringify({ error: "This booking is already fully paid." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    const amount = amount_override ? Math.min(Number(amount_override), balance) : balance;
    const provider = booking.payment_provider || "paystack";
    const currency = booking.currency || "NGN";

    let result: Record<string, unknown>;

    if (provider === "paystack") {
      const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
      if (!paystackKey) throw new Error("Paystack not configured");

      const resp = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100), // Paystack uses kobo
          currency: currency.toUpperCase(),
          reference: `SF-${booking_reference}-${Date.now()}`,
          callback_url: callback_url || undefined,
          metadata: { booking_reference, facility: booking.facility_name },
        }),
      });
      const psData = await resp.json();
      if (!psData.status) throw new Error(psData.message || "Paystack init failed");

      result = {
        provider: "paystack",
        authorization_url: psData.data.authorization_url,
        access_code: psData.data.access_code,
        reference: psData.data.reference,
        amount,
        currency,
      };
    } else if (provider === "stripe") {
      // Stripe Checkout Session (scaffold — implement when Stripe keys are provided)
      throw new Error("Stripe integration coming soon");
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
