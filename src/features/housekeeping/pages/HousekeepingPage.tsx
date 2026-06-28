import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus, Sparkles, User, Loader2, AlertTriangle, CheckCircle2,
  Clock, Play, BedDouble, X,
} from "lucide-react";
import { toast } from "sonner";
import type { MembershipRole } from "@/types/db";

const CAN_MANAGE: MembershipRole[] = ["owner", "manager", "front_desk"];
type TaskStatus = "pending" | "in_progress" | "done";
type TaskType = "cleaning" | "turnover" | "inspection";

interface HkTask {
  id: string; room_id: string; assigned_to: string | null; type: TaskType;
  status: TaskStatus; notes: string | null; due_date: string | null;
  room: { name: string; floor: string | null } | null;
  assignee: { full_name: string | null } | null;
}

interface StaffMember { id: string; full_name: string | null }

const STATUS_META: Record<TaskStatus, { label: string; icon: React.ElementType; cls: string }> = {
  pending: { label: "Pending", icon: Clock, cls: "bg-amber-100 text-amber-700" },
  in_progress: { label: "In Progress", icon: Play, cls: "bg-blue-100 text-blue-700" },
  done: { label: "Done", icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700" },
};

const TYPE_LABEL: Record<TaskType, string> = { cleaning: "Cleaning", turnover: "Turnover", inspection: "Inspection" };

export default function HousekeepingPage() {
  return (
    <RoleGuard roles={["owner", "manager", "front_desk", "housekeeping"]}>
      <HousekeepingContent />
    </RoleGuard>
  );
}

function HousekeepingContent() {
  const { facility, role } = useFacility();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fid = facility?.id;
  const canManage = role ? CAN_MANAGE.includes(role) : false;
  const isHousekeeper = role === "housekeeping";

  const [createOpen, setCreateOpen] = useState(false);

  // Staff list for assignment
  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ["hk-staff", fid],
    enabled: !!fid && canManage,
    queryFn: async () => {
      const { data } = await supabase.from("memberships").select("user_id, profile:profiles(full_name)")
        .eq("facility_id", fid!).eq("status", "active");
      return (data ?? []).map((m) => ({ id: m.user_id, full_name: (m.profile as unknown as { full_name: string | null })?.full_name ?? null }));
    },
  });

  // Rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ["hk-rooms", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data } = await supabase.from("rooms").select("id, name, floor, status").eq("facility_id", fid!).order("name");
      return data ?? [];
    },
  });

  // Tasks
  const { data: tasks = [], isLoading, isError, refetch } = useQuery<HkTask[]>({
    queryKey: ["housekeeping", fid],
    enabled: !!fid,
    queryFn: async () => {
      let q = supabase.from("housekeeping_tasks")
        .select("id, room_id, assigned_to, type, status, notes, due_date, room:rooms(name, floor), assignee:profiles!housekeeping_tasks_assigned_to_fkey(full_name)")
        .eq("facility_id", fid!)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (isHousekeeper && user) q = q.eq("assigned_to", user.id);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((t) => ({
        ...t, type: t.type as TaskType, status: t.status as TaskStatus,
        room: t.room as unknown as HkTask["room"],
        assignee: t.assignee as unknown as HkTask["assignee"],
      }));
    },
  });

  const grouped = useMemo(() => ({
    pending: tasks.filter((t) => t.status === "pending"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  }), [tasks]);

  const dirtyRooms = useMemo(() =>
    rooms.filter((r) => r.status === "dirty" && !tasks.some((t) => t.room_id === r.id && t.status !== "done")),
    [rooms, tasks]
  );

  // Mutations
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      if (status === "done") {
        const { data, error } = await supabase.rpc("complete_housekeeping_task", { p_task_id: id });
        if (error) throw error;
        const r = data as Record<string, unknown>;
        if (r.error) throw new Error(r.error as string);
      } else {
        const { error } = await supabase.from("housekeeping_tasks").update({ status }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["housekeeping", fid] });
      qc.invalidateQueries({ queryKey: ["hk-rooms", fid] });
      qc.invalidateQueries({ queryKey: ["rooms", fid] });
      qc.invalidateQueries({ queryKey: ["dashboard-rooms", fid] });
    },
  });

  const createTask = useMutation({
    mutationFn: async (payload: { room_id: string; type: TaskType; assigned_to?: string; notes?: string; due_date?: string }) => {
      const { error } = await supabase.from("housekeeping_tasks").insert({
        facility_id: fid!, room_id: payload.room_id, type: payload.type,
        assigned_to: payload.assigned_to || null, notes: payload.notes || null,
        due_date: payload.due_date || null, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["housekeeping", fid] });
      toast.success("Task created.");
    },
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Housekeeping</h1>
          <p className="text-sm text-muted-foreground">
            {grouped.pending.length} pending · {dirtyRooms.length} dirty rooms without tasks
          </p>
        </div>
        {canManage && <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New task</Button>}
      </div>

      {/* Dirty rooms quick panel */}
      {canManage && dirtyRooms.length > 0 && (
        <Card className="rounded-2xl border-amber-200 bg-amber-50/30 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Dirty rooms needing tasks</p>
          <div className="flex flex-wrap gap-2">
            {dirtyRooms.map((r) => (
              <Button key={r.id} size="sm" variant="outline" className="gap-1.5 text-xs"
                disabled={createTask.isPending}
                onClick={() => createTask.mutate({ room_id: r.id, type: "cleaning", due_date: format(new Date(), "yyyy-MM-dd") })}>
                <BedDouble className="h-3 w-3" /> Room {r.name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Kanban board */}
      <div className="grid gap-4 lg:grid-cols-3">
        {(["pending", "in_progress", "done"] as const).map((col) => {
          const sm = STATUS_META[col];
          const list = grouped[col];
          return (
            <div key={col}>
              <div className="mb-3 flex items-center gap-2">
                <sm.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{sm.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{list.length}</span>
              </div>
              <div className="space-y-2">
                {list.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed py-8 text-center text-xs text-muted-foreground">
                    No {sm.label.toLowerCase()} tasks
                  </div>
                )}
                {list.map((t) => (
                  <TaskCard key={t.id} task={t} canManage={canManage} onStatusChange={(s) => updateStatus.mutate({ id: t.id, status: s })} updating={updateStatus.isPending} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No housekeeping tasks — they appear automatically after checkouts.</p>
        </div>
      )}

      {/* Create dialog */}
      {createOpen && (
        <CreateTaskDialog
          rooms={rooms}
          staff={staff}
          onSubmit={(p) => createTask.mutate(p, { onSuccess: () => setCreateOpen(false) })}
          isPending={createTask.isPending}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

/* ---- Task card ---- */

function TaskCard({ task, canManage, onStatusChange, updating }: {
  task: HkTask; canManage: boolean; onStatusChange: (s: TaskStatus) => void; updating: boolean;
}) {
  const sm = STATUS_META[task.status];
  const nextStatus: TaskStatus | null = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "done" : null;

  return (
    <Card className="rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{task.room ? `Room ${task.room.name}` : "General"}</p>
          <span className={cn("mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium", sm.cls)}>{TYPE_LABEL[task.type]}</span>
        </div>
        {nextStatus && (canManage || task.status !== "done") && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={updating}
            onClick={() => onStatusChange(nextStatus)}>
            {(() => { const I = updating ? Loader2 : STATUS_META[nextStatus].icon; return <I className={cn("h-3 w-3", updating && "animate-spin")} />; })()}
            {nextStatus === "in_progress" ? "Start" : "Done"}
          </Button>
        )}
      </div>
      {task.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.notes}</p>}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {task.assignee?.full_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.assignee.full_name}</span>}
        {task.due_date && <span>{format(new Date(task.due_date), "MMM d")}</span>}
      </div>
    </Card>
  );
}

/* ---- Create task dialog ---- */

function CreateTaskDialog({ rooms, staff, onSubmit, isPending, onClose }: {
  rooms: { id: string; name: string }[];
  staff: StaffMember[];
  onSubmit: (p: { room_id: string; type: TaskType; assigned_to?: string; notes?: string; due_date?: string }) => void;
  isPending: boolean;
  onClose: () => void;
}) {
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [type, setType] = useState<TaskType>("cleaning");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) { toast.error("Select a room."); return; }
    onSubmit({ room_id: roomId, type, assigned_to: assignedTo || undefined, notes: notes || undefined, due_date: dueDate || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">New housekeeping task</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2"><Label>Room *</Label><NativeSelect value={roomId} onChange={(e) => setRoomId(e.target.value)}>{rooms.map((r) => <option key={r.id} value={r.id}>Room {r.name}</option>)}</NativeSelect></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Type</Label><NativeSelect value={type} onChange={(e) => setType(e.target.value as TaskType)}><option value="cleaning">Cleaning</option><option value="turnover">Turnover</option><option value="inspection">Inspection</option></NativeSelect></div>
            <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Assign to</Label><NativeSelect value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? "User"}</option>)}</NativeSelect></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any details…" /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isPending} className="gap-2">{isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create</Button></div>
        </form>
      </div>
    </div>
  );
}
