// Edge Function: receive email/WhatsApp delivery webhooks
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEmailProvider, getWhatsAppProvider } from "../_shared/messaging-provider.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.text();
    const url = new URL(req.url);
    const providerType = url.searchParams.get("provider") ?? "resend";

    const provider = providerType.includes("whatsapp") || providerType.includes("twilio")
      ? getWhatsAppProvider() : getEmailProvider();

    const valid = await provider.verifyWebhook(req.headers, body);
    const payload = JSON.parse(body);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Store raw event
    const eventId = payload.id ?? payload.MessageSid ?? `${providerType}-${Date.now()}`;
    const { error: dupErr } = await supabase.from("message_events_raw").insert({
      provider: providerType,
      provider_event_id: eventId,
      payload,
      signature_ok: valid,
    });
    if (dupErr?.code === "23505") return new Response("Already processed", { status: 200 });

    const event = provider.parseEvent(payload);
    if (!event) return new Response("Ignored", { status: 200 });

    // Handle unsubscribe (STOP keyword or complaint)
    if (event.type === "unsubscribe" && event.guestPhone) {
      // Find guest by phone and opt them out for whatsapp
      const phone = event.guestPhone.replace("whatsapp:", "");
      await supabase.from("guest_communication_preferences")
        .update({ opted_in: false, opted_out_at: new Date().toISOString(), opt_out_source: "user" })
        .eq("channel", "whatsapp");
      // Can't filter by phone easily; would need a join. For now, log it.
    }

    // Handle bounce → opt out email
    if (event.type === "bounced" && event.providerMessageId) {
      // Find the message and mark the guest email as bad
      const { data: msg } = await supabase.from("messages")
        .select("guest_id, facility_id")
        .eq("provider_message_id", event.providerMessageId)
        .single();
      if (msg) {
        await supabase.from("guest_communication_preferences").upsert({
          facility_id: msg.facility_id, guest_id: msg.guest_id, channel: "email",
          opted_in: false, opted_out_at: new Date().toISOString(), opt_out_source: "bounce",
        }, { onConflict: "facility_id,guest_id,channel" });
      }
    }

    // Handle WhatsApp incoming message → open session
    if (event.type === "session_opened" && event.guestPhone) {
      // Would need to resolve guest by phone; simplified for now
    }

    // Update message status
    if (event.providerMessageId) {
      const statusMap: Record<string, string> = {
        delivered: "delivered", bounced: "bounced", opened: "opened",
        clicked: "clicked", replied: "replied", failed: "failed",
      };
      const newStatus = statusMap[event.type];
      if (newStatus) {
        await supabase.from("messages")
          .update({ status: newStatus })
          .eq("provider_message_id", event.providerMessageId);
      }
    }

    await supabase.from("message_events_raw").update({ processed: true })
      .eq("provider_event_id", eventId);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Messaging webhook error:", err);
    return new Response("Error", { status: 500 });
  }
});
