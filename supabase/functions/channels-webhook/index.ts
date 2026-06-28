// Edge Function: receive OTA reservation webhooks from channel providers
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.text();
    const url = new URL(req.url);
    const connectionId = url.searchParams.get("connection_id");
    if (!connectionId) return new Response("Missing connection_id", { status: 400 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load connection
    const { data: conn } = await supabase
      .from("facility_channel_connections")
      .select("id, facility_id, provider_id, external_account_id")
      .eq("id", connectionId)
      .single();

    if (!conn) return new Response("Connection not found", { status: 404 });

    const payload = JSON.parse(body);

    // Generic webhook handler — extract reservation data
    // Each provider adapter would have its own payload parsing
    const externalId = String(payload.reservation_id ?? payload.id ?? payload.external_id ?? Date.now());
    const channelCode = String(payload.channel ?? payload.source ?? "unknown");

    // Store raw
    await supabase.from("ota_reservations_raw").upsert({
      facility_id: conn.facility_id,
      connection_id: conn.id,
      channel_code: channelCode,
      external_reservation_id: externalId,
      payload,
    }, { onConflict: "connection_id,external_reservation_id" });

    // Process
    await supabase.rpc("process_ota_reservation", {
      p_facility_id: conn.facility_id,
      p_connection_id: conn.id,
      p_channel_code: channelCode,
      p_external_reservation_id: externalId,
      p_payload: payload,
    });

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Error", { status: 500 });
  }
});
