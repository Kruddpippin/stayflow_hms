// Supabase Edge Function: Paystack webhook handler
// Verifies HMAC signature, then records payment idempotently
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) return new Response("Not configured", { status: 500 });

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    // Verify HMAC-SHA512
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(paystackKey), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (computed !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    if (event.event !== "charge.success") {
      return new Response("Ignored", { status: 200 });
    }

    const txData = event.data;
    const reference = txData.reference;
    const amount = txData.amount / 100;
    const method = txData.channel === "card" ? "card"
      : txData.channel === "bank" || txData.channel === "bank_transfer" ? "transfer"
      : "other";

    // Extract booking_reference from metadata
    const bookingRef = txData.metadata?.booking_reference;
    if (!bookingRef) return new Response("No booking reference in metadata", { status: 200 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.rpc("record_verified_payment", {
      p_booking_reference: bookingRef,
      p_amount: amount,
      p_method: method,
      p_provider_ref: reference,
      p_provider: "paystack",
    });

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500 });
  }
});
