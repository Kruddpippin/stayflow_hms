// Edge Function: dispatch queued messages + enqueue from automation triggers
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getEmailProvider, getWhatsAppProvider } from "../_shared/messaging-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple template renderer
function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key.trim()] ?? "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, facility_id, reservation_id, template_code, channel, body_override } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "dispatch_due") {
      // Cron job: pick up queued messages due for sending
      const { data: due } = await supabase
        .from("messages")
        .select("*")
        .eq("status", "queued")
        .lte("scheduled_for", new Date().toISOString())
        .order("scheduled_for")
        .limit(50);

      let sent = 0;
      for (const msg of due ?? []) {
        await supabase.from("messages").update({ status: "sending" }).eq("id", msg.id);

        try {
          let result;
          if (msg.channel === "email") {
            const emailProvider = getEmailProvider();
            result = await emailProvider.sendEmail({
              to: "", // Will be filled from guest
              from: `noreply@stayflow.app`,
              subject: msg.subject ?? "",
              html: msg.body_rendered ?? "",
            });
          } else if (msg.channel === "whatsapp") {
            const waProvider = getWhatsAppProvider();
            // Check for open session
            const { data: session } = await supabase
              .from("whatsapp_sessions")
              .select("id")
              .eq("facility_id", msg.facility_id)
              .eq("guest_id", msg.guest_id)
              .gt("expires_at", new Date().toISOString())
              .limit(1)
              .maybeSingle();

            if (session) {
              result = await waProvider.sendWhatsAppFreeform({ to: "", body: msg.body_rendered ?? "" });
            } else {
              result = await waProvider.sendWhatsAppTemplate({
                to: "", templateName: msg.template_code ?? "", language: "en", variables: [],
              });
            }
          }

          if (result?.success) {
            await supabase.from("messages").update({
              status: "sent", sent_at: new Date().toISOString(),
              provider_message_id: result.messageId,
            }).eq("id", msg.id);
            sent++;
          } else {
            const retries = (msg.retry_count ?? 0) + 1;
            await supabase.from("messages").update({
              status: retries >= 3 ? "failed" : "queued",
              retry_count: retries,
              error: { message: result?.error ?? "Unknown error" },
              scheduled_for: new Date(Date.now() + retries * 60000).toISOString(),
            }).eq("id", msg.id);
          }
        } catch (e) {
          await supabase.from("messages").update({
            status: "failed", error: { message: (e as Error).message },
          }).eq("id", msg.id);
        }
      }

      return new Response(JSON.stringify({ dispatched: sent, total: due?.length ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enqueue" || action === "send_now") {
      // Enqueue a message for a reservation
      if (!facility_id || !reservation_id || !template_code) throw new Error("Missing params");

      // Load reservation + guest + facility
      const { data: res } = await supabase.from("reservations")
        .select("*, guest:guests(*), room_type:room_types(name)")
        .eq("id", reservation_id).single();
      if (!res) throw new Error("Reservation not found");

      const { data: fac } = await supabase.from("facilities")
        .select("name, slug, city, country, phone, email, check_in_time, check_out_time, currency, logo_url, settings")
        .eq("id", facility_id).single();
      if (!fac) throw new Error("Facility not found");

      const guest = res.guest as Record<string, unknown>;
      const ch = channel ?? "email";

      // Find template
      const { data: tpl } = await supabase.from("message_templates")
        .select("*")
        .or(`facility_id.eq.${facility_id},facility_id.is.null`)
        .eq("code", template_code).eq("channel", ch).eq("status", "active")
        .order("facility_id", { ascending: false, nullsFirst: false })
        .limit(1).single();

      const templateBody = body_override ?? tpl?.body ?? "";
      const templateSubject = tpl?.subject ?? "";

      // Build variables
      const firstName = ((guest.full_name as string) ?? "").split(" ")[0] || "Guest";
      const settings = (fac.settings ?? {}) as Record<string, unknown>;
      const vars: Record<string, string> = {
        "guest.first_name": firstName,
        "guest.full_name": (guest.full_name as string) ?? "",
        "guest.email": (guest.email as string) ?? "",
        "facility.name": fac.name ?? "",
        "facility.address": [fac.city, fac.country].filter(Boolean).join(", "),
        "facility.phone": fac.phone ?? "",
        "facility.email": fac.email ?? "",
        "facility.check_in_time": fac.check_in_time ?? "14:00",
        "facility.check_out_time": fac.check_out_time ?? "11:00",
        "reservation.reference": res.booking_reference ?? "",
        "reservation.check_in": res.check_in ?? "",
        "reservation.check_out": res.check_out ?? "",
        "reservation.nights": String((new Date(res.check_out).getTime() - new Date(res.check_in).getTime()) / 86400000),
        "reservation.room_type": ((res.room_type as Record<string, unknown>)?.name as string) ?? "",
        "reservation.adults": String(res.adults ?? 1),
        "reservation.children": String(res.children ?? 0),
        "reservation.total": `${fac.currency} ${Number(res.total_amount).toLocaleString()}`,
        "invoice.balance": `${fac.currency} ${Number(res.total_amount).toLocaleString()}`,
        "links.manage_booking": `${Deno.env.get("PUBLIC_URL") ?? ""}/booking/${res.booking_reference}?email=${encodeURIComponent((guest.email as string) ?? "")}`,
        "links.public_page": `${Deno.env.get("PUBLIC_URL") ?? ""}/book/${fac.slug}`,
        "links.unsubscribe": `${Deno.env.get("PUBLIC_URL") ?? ""}/unsubscribe`,
      };

      const rendered = render(templateBody, vars);
      const subject = render(templateSubject, vars);
      const idempKey = `${reservation_id}-${template_code}-${ch}-${new Date().toISOString().split("T")[0]}`;

      // Check idempotency
      const { data: existing } = await supabase.from("messages")
        .select("id").eq("idempotency_key", idempKey).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ success: true, status: "already_queued" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("messages").insert({
        facility_id, reservation_id, guest_id: res.guest_id,
        channel: ch, template_code, template_version: tpl?.version ?? 1,
        subject, body_rendered: rendered,
        status: action === "send_now" ? "queued" : "queued",
        scheduled_for: new Date().toISOString(),
        idempotency_key: idempKey,
      });

      return new Response(JSON.stringify({ success: true, status: "queued" }), {
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
