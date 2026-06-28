// Edge Function: channel sync operations (push availability, pull reservations, reconcile)
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getProvider } from "../_shared/channel-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, facility_id, connection_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load connection
    const { data: conn } = await supabase
      .from("facility_channel_connections")
      .select("*, provider:channel_providers(name)")
      .eq("id", connection_id)
      .single();

    if (!conn) throw new Error("Connection not found");

    const providerName = (conn.provider as { name: string })?.name ?? "mock";
    const provider = getProvider(providerName);

    let result: Record<string, unknown> = {};

    switch (action) {
      case "pull_reservations": {
        const { reservations } = await provider.fetchReservations(conn, conn.last_synced_at ?? undefined);

        let processed = 0;
        for (const res of reservations) {
          // Upsert into raw table
          await supabase.from("ota_reservations_raw").upsert({
            facility_id,
            connection_id,
            channel_code: res.channel_code,
            external_reservation_id: res.external_reservation_id,
            payload: res,
          }, { onConflict: "connection_id,external_reservation_id" });

          // Process
          await supabase.rpc("process_ota_reservation", {
            p_facility_id: facility_id,
            p_connection_id: connection_id,
            p_channel_code: res.channel_code,
            p_external_reservation_id: res.external_reservation_id,
            p_payload: res,
          });

          await provider.acknowledgeReservation(conn, res.external_reservation_id);
          processed++;
        }

        // Update last_synced_at
        await supabase.from("facility_channel_connections")
          .update({ last_synced_at: new Date().toISOString(), status: "connected", last_error: null })
          .eq("id", connection_id);

        result = { action: "pull_reservations", processed, total: reservations.length };
        break;
      }

      case "push_availability": {
        // Compute availability for all mapped room types
        const { data: mappings } = await supabase
          .from("room_type_channel_mappings")
          .select("room_type_id, external_room_id, markup_percent, min_los, max_los, rate_plan_id")
          .eq("facility_id", facility_id)
          .eq("status", "active");

        if (!mappings?.length) { result = { action: "push_availability", skipped: true }; break; }

        const updates = [];
        for (const m of mappings) {
          // Get availability via the same logic as get_availability RPC
          const { data: avail } = await supabase.rpc("get_availability", {
            p_slug: "", // We need slug — get it
            p_check_in: new Date().toISOString().split("T")[0],
            p_check_out: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
            p_guests: 1,
          });

          const typeAvail = ((avail ?? []) as { id: string; units_available: number; plan_price: number }[])
            .find((a) => a.id === m.room_type_id);

          if (typeAvail && m.external_room_id) {
            const rate = (typeAvail.plan_price ?? 0) * (1 + (m.markup_percent ?? 0) / 100);
            updates.push({
              external_room_id: m.external_room_id,
              dates: [{
                date: new Date().toISOString().split("T")[0],
                available: typeAvail.units_available,
                rate: Math.round(rate * 100) / 100,
                min_los: m.min_los ?? 1,
              }],
            });
          }
        }

        const pushResult = await provider.pushAvailability(conn, updates);

        await supabase.from("channel_sync_log").insert({
          facility_id, connection_id, direction: "push", entity: "availability",
          status: pushResult.success ? "success" : "failure",
          detail: { updates_count: updates.length },
        });

        await supabase.from("facility_channel_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connection_id);

        result = { action: "push_availability", success: pushResult.success, count: updates.length };
        break;
      }

      case "connect": {
        const connectResult = await provider.connect(conn, {});
        await supabase.from("facility_channel_connections")
          .update({
            status: connectResult.success ? "connected" : "error",
            last_error: connectResult.error ?? null,
          })
          .eq("id", connection_id);

        result = { action: "connect", ...connectResult };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
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
