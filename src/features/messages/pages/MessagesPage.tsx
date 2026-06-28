import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Mail, MessageSquare, Send } from "lucide-react";

interface MessageRow {
  id: string; channel: string; template_code: string | null; subject: string | null;
  status: string; scheduled_for: string | null; sent_at: string | null;
  retry_count: number; error: Record<string, unknown> | null;
  guest: { full_name: string } | null;
}

const STATUS_STYLE: Record<string, { cls: string; label: string }> = {
  queued: { cls: "bg-muted text-muted-foreground", label: "Queued" },
  sending: { cls: "bg-blue-100 text-blue-700", label: "Sending" },
  sent: { cls: "bg-emerald-100 text-emerald-700", label: "Sent" },
  delivered: { cls: "bg-emerald-100 text-emerald-700", label: "Delivered" },
  failed: { cls: "bg-red-100 text-red-700", label: "Failed" },
  bounced: { cls: "bg-red-100 text-red-700", label: "Bounced" },
  opened: { cls: "bg-violet-100 text-violet-700", label: "Opened" },
  clicked: { cls: "bg-violet-100 text-violet-700", label: "Clicked" },
  cancelled: { cls: "bg-muted text-muted-foreground", label: "Cancelled" },
};

export default function MessagesPage() {
  return (
    <RoleGuard roles={["owner", "manager", "front_desk"]}>
      <MessagesContent />
    </RoleGuard>
  );
}

function MessagesContent() {
  const { facility } = useFacility();
  const slug = facility?.slug ?? "";
  const fid = facility?.id;

  const [tab, setTab] = useState<"all" | "failed">("all");
  const [channelFilter, setChannelFilter] = useState("");

  const { data: messages = [], isLoading } = useQuery<MessageRow[]>({
    queryKey: ["messages", fid, tab],
    enabled: !!fid,
    queryFn: async () => {
      let q = supabase.from("messages")
        .select("id, channel, template_code, subject, status, scheduled_for, sent_at, retry_count, error, guest:guests(full_name)")
        .eq("facility_id", fid!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (tab === "failed") q = q.in("status", ["failed", "bounced"]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((m) => ({ ...m, guest: m.guest as unknown as MessageRow["guest"] }));
    },
  });

  const filtered = useMemo(() => {
    if (!channelFilter) return messages;
    return messages.filter((m) => m.channel === channelFilter);
  }, [messages, channelFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">{messages.length} message{messages.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/app/${slug}/messages/templates`}><Button variant="outline" size="sm">Templates</Button></Link>
          <Link to={`/app/${slug}/messages/automations`}><Button variant="outline" size="sm">Automations</Button></Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex border-b">
          {(["all", "failed"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("border-b-2 px-4 py-2 text-sm font-medium capitalize",
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}>{t}</button>
          ))}
        </div>
        <NativeSelect className="h-9 w-auto text-sm" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
          <option value="">All channels</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </NativeSelect>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
          <Send className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No messages yet. They'll appear here as bookings come in.</p>
        </Card>
      ) : (
        <Card className="rounded-2xl p-0">
          <div className="divide-y">
            {filtered.map((m) => {
              const st = STATUS_STYLE[m.status] ?? STATUS_STYLE.queued;
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30">
                  {m.channel === "email" ? <Mail className="h-4 w-4 shrink-0 text-muted-foreground" /> :
                    <MessageSquare className="h-4 w-4 shrink-0 text-emerald-600" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.guest?.full_name ?? "Guest"}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.subject ?? m.template_code ?? "Message"}</p>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.sent_at ? format(new Date(m.sent_at), "MMM d, h:mm a") :
                      m.scheduled_for ? format(new Date(m.scheduled_for), "MMM d, h:mm a") : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
