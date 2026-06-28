import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, ArrowLeft, Loader2, X, Zap, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Rule {
  id: string; code: string; name: string; trigger: string; offset_hours: number;
  template_code: string; channel: string; is_active: boolean; conditions: Record<string, unknown>;
}

const TRIGGERS = [
  { value: "reservation.created", label: "Reservation created" },
  { value: "reservation.payment_succeeded", label: "Payment received" },
  { value: "reservation.cancelled", label: "Reservation cancelled" },
  { value: "time.before_check_in", label: "Before check-in" },
  { value: "reservation.check_in_today", label: "Check-in day" },
  { value: "reservation.check_out_today", label: "Check-out day" },
  { value: "time.after_check_out", label: "After check-out" },
];

export default function AutomationsPage() {
  return (
    <RoleGuard roles={["owner", "manager"]}>
      <AutomationsContent />
    </RoleGuard>
  );
}

function AutomationsContent() {
  const { facility } = useFacility();
  const slug = facility?.slug ?? "";
  const fid = facility?.id;
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ["automation-rules", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data, error } = await supabase.from("automation_rules").select("*").eq("facility_id", fid!).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("automation_rules").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules", fid] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-rules", fid] }); toast.success("Rule deleted."); },
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<Rule, "id" | "conditions"> & { facility_id: string }) => {
      const { error } = await supabase.from("automation_rules").insert({ ...rule, conditions: {} });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-rules", fid] });
      toast.success("Automation created.");
      setCreateOpen(false);
    },
  });

  function offsetLabel(trigger: string, offset: number) {
    if (offset === 0) return "Immediately";
    const abs = Math.abs(offset);
    const unit = abs === 1 ? "hour" : abs < 48 ? "hours" : `${Math.round(abs / 24)} days`;
    const val = abs < 48 ? abs : undefined;
    if (trigger.includes("before")) return `${val ?? ""} ${unit} before`;
    if (offset < 0) return `${val ?? ""} ${unit} before`;
    return `${val ?? ""} ${unit} after`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/app/${slug}/messages`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-semibold tracking-tight">Automations</h1>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New automation</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : rules.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-2xl py-16 text-center">
          <Zap className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No automations configured yet. Set up automatic guest messaging.</p>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create automation</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => {
            const triggerLabel = TRIGGERS.find((t) => t.value === r.trigger)?.label ?? r.trigger;
            return (
              <Card key={r.id} className="flex items-center gap-3 rounded-xl p-4">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg",
                  r.is_active ? "bg-primary/10" : "bg-muted"
                )}>
                  {r.channel === "email" ? <Mail className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-emerald-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {triggerLabel} · {offsetLabel(r.trigger, r.offset_hours)} · {r.template_code} via {r.channel}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleRule.mutate({ id: r.id, is_active: r.is_active })}
                    className={cn("relative h-6 w-11 rounded-full transition-colors",
                      r.is_active ? "bg-primary" : "bg-muted-foreground/20"
                    )}>
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      r.is_active ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => { if (window.confirm("Delete this automation?")) deleteRule.mutate(r.id); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CreateRuleDialog
          facilityId={fid!}
          onSubmit={(r) => createRule.mutate(r)}
          saving={createRule.isPending}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

function CreateRuleDialog({ facilityId, onSubmit, saving, onClose }: {
  facilityId: string;
  onSubmit: (r: Omit<Rule, "id" | "conditions"> & { facility_id: string }) => void;
  saving: boolean; onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("reservation.created");
  const [offset, setOffset] = useState("0");
  const [templateCode, setTemplateCode] = useState("booking_confirmation");
  const [channel, setChannel] = useState("email");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required."); return; }
    onSubmit({
      facility_id: facilityId, code: templateCode, name,
      trigger, offset_hours: Number(offset) || 0,
      template_code: templateCode, channel, is_active: true,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">New automation</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pre-arrival reminder" /></div>
          <div className="space-y-2"><Label>Trigger</Label>
            <NativeSelect value={trigger} onChange={(e) => setTrigger(e.target.value)}>
              {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </NativeSelect>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Offset (hours)</Label>
              <Input type="number" value={offset} onChange={(e) => setOffset(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Negative = before, positive = after, 0 = immediate</p>
            </div>
            <div className="space-y-2"><Label>Channel</Label>
              <NativeSelect value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="email">Email</option><option value="whatsapp">WhatsApp</option>
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-2"><Label>Template code</Label>
            <NativeSelect value={templateCode} onChange={(e) => setTemplateCode(e.target.value)}>
              <option value="booking_confirmation">Booking confirmation</option>
              <option value="payment_receipt">Payment receipt</option>
              <option value="pre_arrival_24h">Pre-arrival (24h)</option>
              <option value="check_in_today">Check-in today</option>
              <option value="cancellation">Cancellation</option>
              <option value="post_stay_review">Post-stay review</option>
              <option value="win_back_30d">Win-back (30 days)</option>
            </NativeSelect>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
