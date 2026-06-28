import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus, Wrench, Loader2, AlertTriangle, X, CheckCircle2,
  Clock, Play, User, AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";
import type { MembershipRole } from "@/types/db";

const CAN_MANAGE: MembershipRole[] = ["owner", "manager", "front_desk"];
type OStatus = "open" | "in_progress" | "resolved";
type Priority = "low" | "medium" | "high" | "urgent";

interface MaintOrder {
  id: string; room_id: string | null; reported_by: string | null; assigned_to: string | null;
  priority: Priority; status: OStatus; description: string; created_at: string;
  room: { name: string } | null;
  assignee: { full_name: string | null } | null;
  reporter: { full_name: string | null } | null;
}

const PRIORITY_STYLE: Record<Priority, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", cls: "bg-blue-100 text-blue-700" },
  high: { label: "High", cls: "bg-amber-100 text-amber-700" },
  urgent: { label: "Urgent", cls: "bg-red-100 text-red-700" },
};

const STATUS_ICON: Record<OStatus, React.ElementType> = { open: Clock, in_progress: Play, resolved: CheckCircle2 };
const STATUS_LABEL: Record<OStatus, string> = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };

export default function MaintenancePage() {
  return (
    <RoleGuard roles={["owner", "manager", "front_desk", "maintenance"]}>
      <MaintenanceContent />
    </RoleGuard>
  );
}

function MaintenanceContent() {
  const { facility, role } = useFacility();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fid = facility?.id;
  const canManage = role ? CAN_MANAGE.includes(role) : false;
  const isMaintRole = role === "maintenance";

  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const { data: staff = [] } = useQuery({
    queryKey: ["maint-staff", fid],
    enabled: !!fid && canManage,
    queryFn: async () => {
      const { data } = await supabase.from("memberships").select("user_id, profile:profiles(full_name)").eq("facility_id", fid!).eq("status", "active");
      return (data ?? []).map((m) => ({ id: m.user_id, full_name: (m.profile as unknown as { full_name: string | null })?.full_name ?? null }));
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["maint-rooms", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data } = await supabase.from("rooms").select("id, name, status").eq("facility_id", fid!).order("name");
      return data ?? [];
    },
  });

  const { data: orders = [], isLoading, isError, refetch } = useQuery<MaintOrder[]>({
    queryKey: ["maintenance", fid],
    enabled: !!fid,
    queryFn: async () => {
      let q = supabase.from("maintenance_orders")
        .select("id, room_id, reported_by, assigned_to, priority, status, description, created_at, room:rooms(name), assignee:profiles!maintenance_orders_assigned_to_fkey(full_name), reporter:profiles!maintenance_orders_reported_by_fkey(full_name)")
        .eq("facility_id", fid!)
        .order("created_at", { ascending: false });
      if (isMaintRole && user) q = q.eq("assigned_to", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((o) => ({
        ...o, priority: o.priority as Priority, status: o.status as OStatus,
        room: o.room as unknown as MaintOrder["room"],
        assignee: o.assignee as unknown as MaintOrder["assignee"],
        reporter: o.reporter as unknown as MaintOrder["reporter"],
      }));
    },
  });

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter) list = list.filter((o) => o.status === statusFilter);
    if (priorityFilter) list = list.filter((o) => o.priority === priorityFilter);
    const pOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const sOrder: Record<string, number> = { open: 0, in_progress: 1, resolved: 2 };
    return [...list].sort((a, b) => (sOrder[a.status] ?? 9) - (sOrder[b.status] ?? 9) || (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9));
  }, [orders, statusFilter, priorityFilter]);

  const openCount = orders.filter((o) => o.status === "open").length;
  const urgentCount = orders.filter((o) => o.priority === "urgent" && o.status !== "resolved").length;
  const oorCount = rooms.filter((r) => r.status === "out_of_order").length;

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OStatus }) => {
      if (status === "resolved") {
        const { data, error } = await supabase.rpc("resolve_maintenance_order", { p_order_id: id });
        if (error) throw error;
        const r = data as Record<string, unknown>;
        if (r.error) throw new Error(r.error as string);
      } else {
        const { error } = await supabase.from("maintenance_orders").update({ status }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", fid] });
      qc.invalidateQueries({ queryKey: ["maint-rooms", fid] });
      qc.invalidateQueries({ queryKey: ["rooms", fid] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", fid] });
    },
  });

  const createOrder = useMutation({
    mutationFn: async (p: { room_id?: string; description: string; priority: Priority; assigned_to?: string; take_oor?: boolean }) => {
      const { error } = await supabase.from("maintenance_orders").insert({
        facility_id: fid!, room_id: p.room_id || null, description: p.description,
        priority: p.priority, assigned_to: p.assigned_to || null,
        reported_by: user?.id ?? null, status: "open",
      });
      if (error) throw error;
      if (p.take_oor && p.room_id) {
        await supabase.from("rooms").update({ status: "out_of_order" }).eq("id", p.room_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", fid] });
      qc.invalidateQueries({ queryKey: ["maint-rooms", fid] });
      qc.invalidateQueries({ queryKey: ["rooms", fid] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", fid] });
      toast.success("Work order created.");
    },
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>;
  if (isError) return <div className="flex flex-col items-center gap-3 py-16"><AlertTriangle className="h-8 w-8 text-destructive" /><Button variant="outline" onClick={() => refetch()}>Retry</Button></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground">
            {openCount} open{urgentCount > 0 ? ` · ${urgentCount} urgent` : ""}{oorCount > 0 ? ` · ${oorCount} rooms out of order` : ""}
          </p>
        </div>
        {canManage && <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New work order</Button>}
      </div>

      <div className="flex flex-wrap gap-3">
        <NativeSelect className="h-9 w-auto min-w-[120px] text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {(["open", "in_progress", "resolved"] as OStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </NativeSelect>
        <NativeSelect className="h-9 w-auto min-w-[120px] text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All priorities</option>
          {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_STYLE[p].label}</option>)}
        </NativeSelect>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Wrench className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No work orders — log one when something needs fixing.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const ps = PRIORITY_STYLE[o.priority];
            const SIcon = STATUS_ICON[o.status];
            const nextStatus: OStatus | null = o.status === "open" ? "in_progress" : o.status === "in_progress" ? "resolved" : null;

            return (
              <Card key={o.id} className="flex items-center gap-4 rounded-xl p-4">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", o.priority === "urgent" ? "bg-red-100" : "bg-muted")}>
                  {o.priority === "urgent" ? <AlertOctagon className="h-4 w-4 text-red-600" /> : <Wrench className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.description}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{o.room ? `Room ${o.room.name}` : "General"}</span>
                    <span className={cn("rounded-md px-1.5 py-0.5 font-medium", ps.cls)}>{ps.label}</span>
                    <span className="flex items-center gap-1"><SIcon className="h-3 w-3" />{STATUS_LABEL[o.status]}</span>
                    {o.assignee?.full_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{o.assignee.full_name}</span>}
                    <span>{format(new Date(o.created_at), "MMM d")}</span>
                  </div>
                </div>
                {nextStatus && (canManage || (isMaintRole && o.assigned_to === user?.id)) && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: o.id, status: nextStatus })}>
                    {updateStatus.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : nextStatus === "resolved" ? <CheckCircle2 className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    {nextStatus === "in_progress" ? "Start" : "Resolve"}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CreateOrderDialog rooms={rooms} staff={staff} onSubmit={(p) => createOrder.mutate(p, { onSuccess: () => setCreateOpen(false) })} isPending={createOrder.isPending} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}

function CreateOrderDialog({ rooms, staff, onSubmit, isPending, onClose }: {
  rooms: { id: string; name: string }[];
  staff: { id: string; full_name: string | null }[];
  onSubmit: (p: { room_id?: string; description: string; priority: Priority; assigned_to?: string; take_oor?: boolean }) => void;
  isPending: boolean; onClose: () => void;
}) {
  const [roomId, setRoomId] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [takeOor, setTakeOor] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) { toast.error("Description is required."); return; }
    onSubmit({ room_id: roomId || undefined, description: desc, priority, assigned_to: assignedTo || undefined, take_oor: takeOor && !!roomId });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">New work order</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2"><Label>Room</Label><NativeSelect value={roomId} onChange={(e) => setRoomId(e.target.value)}><option value="">General (no room)</option>{rooms.map((r) => <option key={r.id} value={r.id}>Room {r.name}</option>)}</NativeSelect></div>
          <div className="space-y-2"><Label>Description *</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What needs fixing?" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Priority</Label><NativeSelect value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_STYLE[p].label}</option>)}
            </NativeSelect></div>
            <div className="space-y-2"><Label>Assign to</Label><NativeSelect value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? "User"}</option>)}</NativeSelect></div>
          </div>
          {roomId && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={takeOor} onChange={(e) => setTakeOor(e.target.checked)} className="h-4 w-4 rounded border-input" />
              Take room out of service
            </label>
          )}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isPending} className="gap-2">{isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create</Button></div>
        </form>
      </div>
    </div>
  );
}
