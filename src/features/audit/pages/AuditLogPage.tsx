import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Search, Download, FileText, ChevronDown,
  User, Clock, Globe, ArrowRight, X, Shield,
} from "lucide-react";

interface AuditRow {
  id: string; action: string; entity_table: string; entity_id: string;
  entity_label: string | null; severity: string;
  actor_display: string | null; actor_role: string | null; actor_kind: string;
  ip: string | null; source: string | null;
  diff: Record<string, [unknown, unknown]> | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_GROUPS: Record<string, string[]> = {
  Reservations: ["reservations.created", "reservations.updated", "reservations.deleted",
    "reservation.checked_in", "reservation.checked_out", "reservation.cancelled", "reservation.no_show"],
  Payments: ["payments.created", "payment.recorded", "payment.verified"],
  Invoices: ["invoices.created", "invoices.updated", "invoice.issued", "invoice.voided"],
  Rooms: ["rooms.created", "rooms.updated", "rooms.deleted", "room_types.created", "room_types.updated"],
  Staff: ["memberships.created", "memberships.updated", "memberships.deleted",
    "invitations.created", "invitation.sent", "invitation.accepted"],
  Settings: ["facilities.updated", "facility.settings_updated"],
  Channels: ["channel.connected", "channel.reservation_ingested"],
  Billing: ["subscriptions.created", "subscriptions.updated", "subscription.changed"],
};

function actionLabel(action: string): string {
  const parts = action.split(".");
  const entity = parts[0]?.replace("_", " ") ?? "";
  const verb = parts[1] ?? "";
  return `${verb.replace("_", " ")} ${entity}`;
}

export default function AuditLogPage() {
  return (
    <RoleGuard roles={["owner", "manager", "accountant"]}>
      <AuditContent />
    </RoleGuard>
  );
}

function AuditContent() {
  const { facility, role } = useFacility();
  const fid = facility?.id;
  const slug = facility?.slug ?? "";
  const isAccountant = role === "accountant";

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [dateRange, setDateRange] = useState("7d");
  const [selectedEvent, setSelectedEvent] = useState<AuditRow | null>(null);

  const fromDate = useMemo(() => {
    const d = new Date();
    if (dateRange === "24h") d.setHours(d.getHours() - 24);
    else if (dateRange === "7d") d.setDate(d.getDate() - 7);
    else if (dateRange === "30d") d.setDate(d.getDate() - 30);
    else d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, [dateRange]);

  const { data: events = [], isLoading, refetch } = useQuery<AuditRow[]>({
    queryKey: ["audit", fid, fromDate, actionFilter, severityFilter],
    enabled: !!fid,
    queryFn: async () => {
      let q = supabase.from("audit_events")
        .select("id, action, entity_table, entity_id, entity_label, severity, actor_display, actor_role, actor_kind, ip, source, diff, before, after, metadata, created_at")
        .eq("facility_id", fid!)
        .gte("created_at", fromDate)
        .order("created_at", { ascending: false })
        .limit(200);

      if (actionFilter) q = q.eq("action", actionFilter);
      if (severityFilter) q = q.eq("severity", severityFilter);
      if (isAccountant) q = q.in("entity_table", ["payments", "invoices", "invoice_items"]);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    if (!fid) return;
    const channel = supabase.channel("audit-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_events",
        filter: `facility_id=eq.${fid}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fid, refetch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter((e) =>
      e.action.toLowerCase().includes(q) ||
      (e.entity_label ?? "").toLowerCase().includes(q) ||
      (e.actor_display ?? "").toLowerCase().includes(q)
    );
  }, [events, search]);

  function exportCsv() {
    const header = "Time,Actor,Role,Action,Entity,Label,Severity,IP,Source\n";
    const rows = filtered.map((e) =>
      `"${format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss")}","${e.actor_display ?? "System"}","${e.actor_role ?? ""}","${e.action}","${e.entity_table}","${e.entity_label ?? ""}","${e.severity}","${e.ip ?? ""}","${e.source ?? ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-${slug}-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <NativeSelect className="h-9 w-auto text-sm" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </NativeSelect>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search actions, labels, actors…" className="h-9 pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-auto text-sm" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(ACTION_GROUPS).map(([group, actions]) => (
            <optgroup key={group} label={group}>
              {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
            </optgroup>
          ))}
        </NativeSelect>
        <NativeSelect className="h-9 w-auto text-sm" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="notice">Notice</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </NativeSelect>
      </div>

      {/* Events list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
          <Shield className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No audit events for this period.</p>
        </Card>
      ) : (
        <Card className="rounded-2xl p-0">
          <div className="divide-y">
            {filtered.map((e) => (
              <button key={e.id} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-muted/30"
                onClick={() => setSelectedEvent(e)}>
                <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full",
                  e.severity === "critical" ? "bg-red-500" : e.severity === "warning" ? "bg-amber-500" :
                  e.severity === "notice" ? "bg-blue-500" : "bg-muted-foreground/30"
                )} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{e.actor_display ?? "System"}</span>
                    {e.actor_role && <span className="text-muted-foreground"> ({e.actor_role})</span>}
                    {" "}<span className="text-muted-foreground">{actionLabel(e.action)}</span>
                    {e.entity_label && <span className="font-medium"> {e.entity_label}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(new Date(e.created_at), "MMM d, h:mm:ss a")}
                    {e.ip && ` · ${e.ip}`}
                    {e.source && ` · ${e.source}`}
                  </p>
                </div>
                <ChevronDown className="mt-1 h-4 w-4 shrink-0 -rotate-90 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Detail drawer */}
      {selectedEvent && (
        <EventDetailDrawer event={selectedEvent} slug={slug} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

/* ---- Event detail drawer ---- */

function EventDetailDrawer({ event: e, slug, onClose }: { event: AuditRow; slug: string; onClose: () => void }) {
  const [tab, setTab] = useState<"summary" | "diff" | "raw">("summary");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border bg-card shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-3">
          <h3 className="text-sm font-semibold">{actionLabel(e.action)}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex border-b">
          {(["summary", "diff", "raw"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 border-b-2 py-2 text-xs font-medium capitalize",
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}>{t}</button>
          ))}
        </div>

        <div className="p-5">
          {tab === "summary" && (
            <div className="space-y-3 text-sm">
              <Row icon={User} label="Actor" value={`${e.actor_display ?? "System"} (${e.actor_role ?? e.actor_kind})`} />
              <Row icon={Clock} label="When" value={format(new Date(e.created_at), "MMM d, yyyy 'at' h:mm:ss a")} />
              <Row icon={FileText} label="Entity" value={`${e.entity_table} / ${e.entity_label ?? e.entity_id}`} />
              <Row icon={Globe} label="Source" value={[e.source, e.ip].filter(Boolean).join(" · ") || "—"} />
              <Row icon={Shield} label="Severity" value={e.severity} />
              {e.metadata && Object.keys(e.metadata).length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono break-all">{JSON.stringify(e.metadata, null, 2)}</div>
              )}
              <a href={`/app/${slug}/${e.entity_table === "reservations" ? "reservations" : e.entity_table}/${e.entity_id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Open {e.entity_table.slice(0, -1)} <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          )}

          {tab === "diff" && (
            <div className="space-y-2">
              {e.diff && Object.keys(e.diff).length > 0 ? (
                Object.entries(e.diff).map(([key, vals]) => (
                  <div key={key} className="rounded-lg border p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">{key}</p>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-red-50 px-2 py-1 text-red-700 break-all">
                        {JSON.stringify((vals as unknown[])[0]) ?? "—"}
                      </div>
                      <div className="rounded bg-emerald-50 px-2 py-1 text-emerald-700 break-all">
                        {JSON.stringify((vals as unknown[])[1]) ?? "—"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No field changes recorded.</p>
              )}
            </div>
          )}

          {tab === "raw" && (
            <div className="space-y-3">
              {e.before && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Before</p>
                  <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-[11px] break-all">{JSON.stringify(e.before, null, 2)}</pre>
                </div>
              )}
              {e.after && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">After</p>
                  <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-[11px] break-all">{JSON.stringify(e.after, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
