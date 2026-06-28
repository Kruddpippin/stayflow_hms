import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Sparkles, BedDouble, Wrench, Check, Play, LogOut,
  Wifi, WifiOff, Camera, AlertTriangle, Loader2,
  ChevronRight, ArrowLeft, Search, X, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { enqueueOutboxItem, flushOutbox, getOutboxItems } from "../lib/outbox";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface HkTask {
  id: string; room_id: string; assigned_to: string | null; type: string;
  status: string; notes: string | null; due_date: string | null; facility_id: string;
  room: { name: string; floor: string | null } | null;
}

interface RoomRow {
  id: string; name: string; floor: string | null; status: string;
}

type Tab = "day" | "rooms" | "issues";

const TYPE_ICON: Record<string, React.ElementType> = { cleaning: Sparkles, turnover: RefreshCw, inspection: Search };

/* ------------------------------------------------------------------ */
/*  Main App                                                          */
/* ------------------------------------------------------------------ */

export default function MobileApp() {
  const { facilitySlug } = useParams<{ facilitySlug: string }>();
  const { session, user, loading: authLoading, signOut } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("day");
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [detailTask, setDetailTask] = useState<HkTask | null>(null);

  // Online/offline tracking
  useEffect(() => {
    const onOnline = () => { setOnline(true); flushOutbox().then(r => { if (r.flushed) qc.invalidateQueries(); }); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [qc]);

  // Outbox pending count
  useEffect(() => {
    const interval = setInterval(async () => {
      const items = await getOutboxItems();
      setPendingCount(items.length);
      if (items.length > 0 && navigator.onLine) {
        const r = await flushOutbox();
        if (r.flushed > 0) qc.invalidateQueries();
        const remaining = await getOutboxItems();
        setPendingCount(remaining.length);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [qc]);

  // Load facility
  const { data: facility } = useQuery({
    queryKey: ["mobile-facility", facilitySlug],
    enabled: !!facilitySlug && !!session,
    queryFn: async () => {
      const { data } = await supabase.from("facilities").select("id, name, slug, timezone").eq("slug", facilitySlug!).single();
      return data;
    },
  });

  // Check membership
  const { data: membership } = useQuery({
    queryKey: ["mobile-membership", facility?.id, user?.id],
    enabled: !!facility && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("memberships").select("role, status")
        .eq("facility_id", facility!.id).eq("user_id", user!.id).eq("status", "active").single();
      return data;
    },
  });

  const role = membership?.role;
  const isHousekeeper = role === "housekeeping";
  const isSupervisor = ["owner", "manager", "front_desk"].includes(role ?? "");

  if (authLoading) return <MobileLoader />;

  // Not logged in → login
  if (!session) {
    return <MobileLogin facilitySlug={facilitySlug!} />;
  }

  // No facility or no access
  if (!facility || (!isHousekeeper && !isSupervisor)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center" style={{ maxWidth: 448, margin: "0 auto" }}>
        <Sparkles className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-lg font-semibold">This app is for housekeeping staff</p>
        <p className="text-sm text-muted-foreground">Ask your facility manager to assign you the housekeeping role.</p>
        <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 safe-area-top">
        <span className="text-sm font-semibold truncate">{facility.name}</span>
        <div className="flex items-center gap-2">
          <OnlineBadge online={online} pending={pendingCount} />
          <button onClick={() => signOut()} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {detailTask ? (
          <TaskDetail task={detailTask} facilityId={facility.id} isSupervisor={isSupervisor}
            onBack={() => setDetailTask(null)} onUpdate={() => { qc.invalidateQueries({ queryKey: ["mobile-tasks"] }); setDetailTask(null); }} />
        ) : tab === "day" ? (
          <MyDayTab facilityId={facility.id} userId={user!.id} isHousekeeper={isHousekeeper}
            onTaskClick={setDetailTask} onFlush={() => flushOutbox().then(() => qc.invalidateQueries())} />
        ) : tab === "rooms" ? (
          <RoomsTab facilityId={facility.id} />
        ) : (
          <IssuesTab facilityId={facility.id} userId={user!.id} isHousekeeper={isHousekeeper} />
        )}
      </main>

      {/* Bottom tabs */}
      {!detailTask && (
        <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 border-t bg-card safe-area-bottom">
          {([
            { key: "day" as Tab, label: "My Day", icon: Sparkles },
            { key: "rooms" as Tab, label: "Rooms", icon: BedDouble },
            { key: "issues" as Tab, label: "Issues", icon: Wrench },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium",
                tab === t.key ? "text-primary" : "text-muted-foreground"
              )}>
              <t.icon className="h-5 w-5" />
              {t.label}
            </button>
          ))}
        </nav>
      )}

      {/* Desktop note for wide screens */}
      <div className="fixed bottom-4 right-4 hidden lg:block">
        <Link to={`/app/${facilitySlug}/housekeeping`}
          className="rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground shadow-md hover:text-primary">
          Open full Housekeeping board →
        </Link>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Components                                                        */
/* ================================================================== */

function MobileLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function OnlineBadge({ online, pending }: { online: boolean; pending: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
      !online ? "bg-red-100 text-red-700" : pending > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
    )}>
      {!online ? <><WifiOff className="h-3 w-3" /> Offline</> :
        pending > 0 ? <>{pending} pending</> : <><Wifi className="h-3 w-3" /> Online</>}
    </span>
  );
}

function MobileLogin({ facilitySlug: _slug }: { facilitySlug: string }) { void _slug;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    setLoading(false);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h1 className="text-xl font-bold">StayFlow Housekeeping</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to start your shift</p>
      </div>
      <form onSubmit={handleLogin} className="w-full space-y-4">
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" autoComplete="email" /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" autoComplete="current-password" /></div>
        <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Log in
        </Button>
      </form>
    </div>
  );
}

/* ---- My Day ---- */

function MyDayTab({ facilityId, userId, isHousekeeper, onTaskClick }: {
  facilityId: string; userId: string; isHousekeeper: boolean;
  onTaskClick: (t: HkTask) => void; onFlush?: () => void;
}) {
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<HkTask[]>({
    queryKey: ["mobile-tasks", facilityId],
    queryFn: async () => {
      let q = supabase.from("housekeeping_tasks")
        .select("id, room_id, assigned_to, type, status, notes, due_date, facility_id, room:rooms(name, floor)")
        .eq("facility_id", facilityId)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (isHousekeeper) q = q.eq("assigned_to", userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((t) => ({ ...t, room: t.room as unknown as HkTask["room"] }));
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase.channel("hk-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "housekeeping_tasks",
        filter: `facility_id=eq.${facilityId}` }, () => qc.invalidateQueries({ queryKey: ["mobile-tasks"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [facilityId, qc]);

  async function quickAction(task: HkTask, newStatus: string) {
    // Optimistic update
    qc.setQueryData<HkTask[]>(["mobile-tasks", facilityId], (old) =>
      old?.map((t) => t.id === task.id ? { ...t, status: newStatus } : t)
    );

    await enqueueOutboxItem({
      entity: "housekeeping_task", op: "update_status",
      payload: { task_id: task.id, status: newStatus },
      idempotencyKey: `task:${task.id}:${newStatus}:${Date.now()}`,
    });

    if (navigator.onLine) {
      const r = await flushOutbox();
      if (r.flushed > 0) qc.invalidateQueries({ queryKey: ["mobile-tasks"] });
    }
  }

  const pending = tasks.filter((t) => t.status === "pending");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");
  const doneCount = done.length;
  const totalCount = tasks.length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">My Day</p>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMM d")}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {doneCount}/{totalCount}
        </span>
      </div>

      {isLoading && <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>}

      {!isLoading && tasks.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Check className="h-10 w-10 text-emerald-500" />
          <p className="text-base font-medium">All done!</p>
          <p className="text-sm text-muted-foreground">No tasks assigned to you right now.</p>
        </div>
      )}

      {inProgress.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">In progress ({inProgress.length})</p>
          {inProgress.map((t) => (
            <TaskCard key={t.id} task={t} onTap={() => onTaskClick(t)}
              action={{ label: "Done", onClick: () => quickAction(t, "done") }} />
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">Pending ({pending.length})</p>
          {pending.map((t) => (
            <TaskCard key={t.id} task={t} onTap={() => onTaskClick(t)}
              action={{ label: "Start", onClick: () => quickAction(t, "in_progress") }} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Done ({done.length})</p>
          {done.map((t) => <TaskCard key={t.id} task={t} onTap={() => onTaskClick(t)} dimmed />)}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onTap, action, dimmed }: {
  task: HkTask; onTap: () => void; action?: { label: string; onClick: () => void }; dimmed?: boolean;
}) {
  const TypeIcon = TYPE_ICON[task.type] ?? Sparkles;
  return (
    <div className={cn("mb-2 flex items-center gap-3 rounded-2xl border bg-card p-4", dimmed && "opacity-50")} onClick={onTap}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
        <TypeIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold">{task.room?.name ?? "Room"}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {task.type}{task.room?.floor ? ` · Floor ${task.room.floor}` : ""}
          {task.due_date ? ` · ${format(new Date(task.due_date), "h:mm a")}` : ""}
        </p>
      </div>
      {action && (
        <Button size="sm" className="h-10 min-w-[72px] shrink-0 text-sm"
          onClick={(e) => { e.stopPropagation(); action.onClick(); }}>
          {action.label}
        </Button>
      )}
      {!action && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </div>
  );
}

/* ---- Task Detail ---- */

function TaskDetail({ task, facilityId, isSupervisor, onBack, onUpdate }: {
  task: HkTask; facilityId: string; isSupervisor: boolean;
  onBack: () => void; onUpdate: () => void;
}) {
  const [issueOpen, setIssueOpen] = useState(false);

  async function changeStatus(newStatus: string) {
    await enqueueOutboxItem({
      entity: "housekeeping_task", op: "update_status",
      payload: { task_id: task.id, status: newStatus },
      idempotencyKey: `task:${task.id}:${newStatus}:${Date.now()}`,
    });
    if (navigator.onLine) await flushOutbox();
    toast.success(newStatus === "done" ? "Task completed!" : "Status updated.");
    onUpdate();
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress via canvas
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const maxDim = 1200;
    const scale = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8));
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    await enqueueOutboxItem({
      entity: "task_photo", op: "upload_photo",
      payload: { facility_id: facilityId, task_id: task.id, blob_base64: base64, filename: `${crypto.randomUUID()}.jpg` },
      idempotencyKey: `photo:${task.id}:${Date.now()}`,
    });
    toast.success("Photo queued for upload.");
    if (navigator.onLine) flushOutbox();
  }

  return (
    <div className="p-4 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Back</button>

      <div className="text-center">
        <p className="text-4xl font-bold">{task.room?.name ?? "Room"}</p>
        <p className="mt-1 text-sm text-muted-foreground capitalize">{task.type}{task.room?.floor ? ` · Floor ${task.room.floor}` : ""}</p>
      </div>

      {task.notes && <div className="rounded-xl bg-muted/50 p-3 text-sm">{task.notes}</div>}

      {/* Photos */}
      <div className="flex gap-2">
        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed">
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          <Camera className="h-6 w-6 text-muted-foreground" />
        </label>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        {task.status === "pending" && (
          <Button className="w-full h-14 text-lg gap-2" onClick={() => changeStatus("in_progress")}>
            <Play className="h-5 w-5" /> Start cleaning
          </Button>
        )}
        {task.status === "in_progress" && (
          <Button className="w-full h-14 text-lg gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => changeStatus("done")}>
            <Check className="h-5 w-5" /> Mark complete
          </Button>
        )}
        {task.status === "done" && isSupervisor && (
          <Button variant="outline" className="w-full h-14 text-lg gap-2" onClick={() => changeStatus("pending")}>
            <RefreshCw className="h-5 w-5" /> Reopen
          </Button>
        )}

        <Button variant="outline" className="w-full h-12 gap-2" onClick={() => setIssueOpen(true)}>
          <AlertTriangle className="h-4 w-4" /> Report issue
        </Button>
      </div>

      {issueOpen && (
        <ReportIssue facilityId={facilityId} roomId={task.room_id} userId="" onClose={() => setIssueOpen(false)} />
      )}
    </div>
  );
}

/* ---- Rooms Tab ---- */

function RoomsTab({ facilityId }: { facilityId: string }) {
  const [search, setSearch] = useState("");
  const { data: rooms = [], isLoading } = useQuery<RoomRow[]>({
    queryKey: ["mobile-rooms", facilityId],
    queryFn: async () => {
      const { data } = await supabase.from("rooms").select("id, name, floor, status")
        .eq("facility_id", facilityId).order("name");
      return data ?? [];
    },
  });

  const filtered = search ? rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())) : rooms;

  const STATUS_CLR: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-700", occupied: "bg-blue-100 text-blue-700",
    dirty: "bg-amber-100 text-amber-700", clean: "bg-teal-100 text-teal-700", out_of_order: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-4 space-y-3">
      <p className="text-lg font-bold">Rooms</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search rooms…" className="h-12 pl-10 text-base" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading && <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>}
      {filtered.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
          <div>
            <p className="text-base font-semibold">{r.name}</p>
            <p className="text-xs text-muted-foreground">{r.floor ? `Floor ${r.floor}` : ""}</p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", STATUS_CLR[r.status] ?? "bg-muted")}>{r.status.replace("_", " ")}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- Issues Tab ---- */

function IssuesTab({ facilityId, userId, isHousekeeper }: { facilityId: string; userId: string; isHousekeeper: boolean }) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["mobile-issues", facilityId],
    queryFn: async () => {
      let q = supabase.from("maintenance_orders")
        .select("id, description, priority, status, room:rooms(name), created_at")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false }).limit(20);
      if (isHousekeeper) q = q.eq("reported_by", userId);
      const { data } = await q;
      return (data ?? []).map((o) => ({ ...o, room: o.room as unknown as { name: string } | null }));
    },
  });

  const PRIORITY_CLR: Record<string, string> = {
    low: "bg-muted text-muted-foreground", medium: "bg-blue-100 text-blue-700",
    high: "bg-amber-100 text-amber-700", urgent: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-4 space-y-3">
      <p className="text-lg font-bold">Issues reported</p>
      {isLoading && <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>}
      {orders.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No issues reported.</p>}
      {orders.map((o) => (
        <div key={o.id} className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium truncate">{o.description}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{o.room?.name ?? "General"}</span>
            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize", PRIORITY_CLR[o.priority])}>{o.priority}</span>
            <span className="capitalize">{o.status.replace("_", " ")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Report Issue ---- */

function ReportIssue({ facilityId, roomId, userId, onClose }: {
  facilityId: string; roomId: string; userId: string; onClose: () => void;
}) {
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) { toast.error("Describe the issue."); return; }
    setSaving(true);
    await enqueueOutboxItem({
      entity: "maintenance_order", op: "create_order",
      payload: { facility_id: facilityId, room_id: roomId, description: desc, priority, reported_by: userId || null, status: "open" },
      idempotencyKey: `maint:${roomId}:${Date.now()}`,
    });
    if (navigator.onLine) await flushOutbox();
    toast.success("Issue reported!");
    setSaving(false);
    onClose();
  }

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Report issue</p>
        <button onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What needs fixing?" className="text-base" />
        <NativeSelect value={priority} onChange={(e) => setPriority(e.target.value)} className="h-12 text-base">
          <option value="low">Low</option><option value="medium">Medium</option>
          <option value="high">High</option><option value="urgent">Urgent</option>
        </NativeSelect>
        <Button type="submit" className="w-full h-12 text-base" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit
        </Button>
      </form>
    </div>
  );
}
