import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFacility } from "@/components/providers/FacilityProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus, Search, LayoutGrid, List, BedDouble, Loader2,
  Pencil, Trash2, Wrench, AlertTriangle, ChevronDown, Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  useRooms, useRoomTypes, useCreateRoom, useBulkCreateRooms,
  useUpdateRoom, useDeleteRoom, useChangeRoomStatus,
  type RoomRow, type RoomTypeRow,
} from "../hooks/useRooms";
import type { RoomStatus, MembershipRole } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<RoomStatus, { label: string; color: string; dot: string }> = {
  available:    { label: "Available",    color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  occupied:     { label: "Occupied",     color: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
  dirty:        { label: "Dirty",        color: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
  clean:        { label: "Clean",        color: "bg-teal-100 text-teal-700",       dot: "bg-teal-500" },
  out_of_order: { label: "Out of order", color: "bg-red-100 text-red-700",         dot: "bg-red-500" },
};

const ALL_STATUSES: RoomStatus[] = ["available", "occupied", "dirty", "clean", "out_of_order"];
const CAN_CRUD: MembershipRole[] = ["owner", "manager"];
const CAN_STATUS: MembershipRole[] = ["owner", "manager", "front_desk", "housekeeping"];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function RoomsPage() {
  const { facility, role } = useFacility();
  const slug = facility?.slug ?? "";
  const { data: rooms = [], isLoading: roomsLoading, isError: roomsError, refetch: refetchRooms } = useRooms();
  const { data: roomTypes = [], isLoading: typesLoading } = useRoomTypes();

  const canCrud = role ? CAN_CRUD.includes(role) : false;
  const canChangeStatus = role ? CAN_STATUS.includes(role) : false;

  const [view, setView] = useState<"board" | "table">("board");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomRow | null>(null);

  const filtered = useMemo(() => {
    let list = rooms;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (filterType) list = list.filter((r) => r.room_type_id === filterType);
    if (filterStatus) list = list.filter((r) => r.status === filterStatus);
    return list;
  }, [rooms, search, filterType, filterStatus]);

  const grouped = useMemo(() => {
    const map = new Map<string, { type: RoomTypeRow | null; rooms: RoomRow[] }>();
    for (const rt of roomTypes) map.set(rt.id, { type: rt, rooms: [] });
    for (const r of filtered) {
      const entry = map.get(r.room_type_id);
      if (entry) entry.rooms.push(r);
      else {
        if (!map.has("uncategorized")) map.set("uncategorized", { type: null, rooms: [] });
        map.get("uncategorized")!.rooms.push(r);
      }
    }
    return [...map.values()].filter((g) => g.rooms.length > 0);
  }, [filtered, roomTypes]);

  const isLoading = roomsLoading || typesLoading;

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      </div>
    );
  }

  if (roomsError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load rooms.</p>
        <Button variant="outline" onClick={() => refetchRooms()}>Retry</Button>
      </div>
    );
  }

  /* ---- Empty states ---- */
  if (roomTypes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Create a room type first</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Before adding rooms, you need at least one room type (e.g. Standard, Deluxe).
        </p>
        <Link to={`/app/${slug}/room-types`}>
          <Button className="gap-2"><Plus className="h-4 w-4" /> Create room type</Button>
        </Link>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <BedDouble className="h-10 w-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">No rooms yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">Add rooms to start managing occupancy and housekeeping.</p>
        {canCrud && (
          <div className="flex gap-3">
            <Button className="gap-2" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add room</Button>
            <Button variant="outline" className="gap-2" onClick={() => setBulkOpen(true)}><Layers className="h-4 w-4" /> Add multiple</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Rooms</h1>
          <p className="text-sm text-muted-foreground">{rooms.length} rooms across {roomTypes.length} types</p>
        </div>
        {canCrud && (
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add room</Button>
            <Button variant="outline" className="gap-2" onClick={() => setBulkOpen(true)}><Layers className="h-4 w-4" /> Add multiple</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search rooms…" className="h-9 pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-auto min-w-[130px] text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All types</option>
          {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </NativeSelect>
        <NativeSelect className="h-9 w-auto min-w-[130px] text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as RoomStatus | "")}>
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </NativeSelect>
        <div className="ml-auto flex rounded-lg border p-0.5">
          <button onClick={() => setView("board")} className={cn("rounded-md p-1.5", view === "board" ? "bg-accent" : "text-muted-foreground")} aria-label="Board view"><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setView("table")} className={cn("rounded-md p-1.5", view === "table" ? "bg-accent" : "text-muted-foreground")} aria-label="Table view"><List className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Board view */}
      {view === "board" && (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.type?.id ?? "uncategorized"}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {g.type?.name ?? "Uncategorized"} <span className="font-normal">({g.rooms.length})</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                {g.rooms.map((r) => (
                  <RoomCard key={r.id} room={r} slug={slug} canCrud={canCrud} canChangeStatus={canChangeStatus} onEdit={() => setEditingRoom(r)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table view */}
      {view === "table" && (
        <Card className="rounded-2xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Room</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Floor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <RoomTableRow key={r.id} room={r} slug={slug} canCrud={canCrud} canChangeStatus={canChangeStatus} onEdit={() => setEditingRoom(r)} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filtered.length === 0 && rooms.length > 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">No rooms match your filters.</div>
      )}

      {/* Dialogs */}
      {addOpen && <RoomDialog roomTypes={roomTypes} onClose={() => setAddOpen(false)} />}
      {editingRoom && <RoomDialog roomTypes={roomTypes} room={editingRoom} onClose={() => setEditingRoom(null)} />}
      {bulkOpen && <BulkDialog roomTypes={roomTypes} onClose={() => setBulkOpen(false)} />}
    </div>
  );
}

/* ================================================================== */
/*  Room card (board view)                                            */
/* ================================================================== */

function RoomCard({ room, slug, canCrud, canChangeStatus, onEdit }: {
  room: RoomRow; slug: string; canCrud: boolean; canChangeStatus: boolean; onEdit: () => void;
}) {
  const [popover, setPopover] = useState(false);
  const changeStatus = useChangeRoomStatus();
  const deleteRoom = useDeleteRoom();
  const sc = STATUS_CONFIG[room.status];

  function handleStatusChange(status: RoomStatus) {
    changeStatus.mutate({ id: room.id, status });
    setPopover(false);
  }

  function handleDelete() {
    if (!window.confirm(`Delete room ${room.name}? Any future reservations assigned to this room will lose their assignment.`)) return;
    deleteRoom.mutate(room.id, { onError: (e) => toast.error(e.message) });
    setPopover(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setPopover(!popover)}
        className={cn(
          "flex w-full flex-col items-start rounded-2xl border bg-card p-4 text-left transition-shadow hover:shadow-md",
          popover && "ring-2 ring-ring"
        )}
      >
        <div className="mb-2 flex w-full items-center justify-between">
          <span className="text-base font-semibold">{room.name}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", sc.color)}>{sc.label}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {room.room_type?.name}{room.floor ? ` · Floor ${room.floor}` : ""}
        </span>
      </button>

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl border bg-card p-1.5 shadow-lg">
            {canChangeStatus && (
              <>
                <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Set status</p>
                {ALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={cn("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-accent",
                      room.status === s && "bg-accent font-medium"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", STATUS_CONFIG[s].dot)} />
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
                <div className="my-1 border-t" />
              </>
            )}
            {canCrud && (
              <button onClick={() => { setPopover(false); onEdit(); }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" /> Edit room
              </button>
            )}
            <Link to={`/app/${slug}/maintenance`}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setPopover(false)}>
              <Wrench className="h-3.5 w-3.5" /> Raise maintenance
            </Link>
            {canCrud && (
              <button onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" /> Delete room
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Room table row                                                    */
/* ================================================================== */

function RoomTableRow({ room, slug, canCrud, canChangeStatus, onEdit }: {
  room: RoomRow; slug: string; canCrud: boolean; canChangeStatus: boolean; onEdit: () => void;
}) {
  const changeStatus = useChangeRoomStatus();
  const deleteRoom = useDeleteRoom();
  const sc = STATUS_CONFIG[room.status];

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3 font-medium">{room.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{room.room_type?.name ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground">{room.floor ?? "—"}</td>
      <td className="px-4 py-3">
        {canChangeStatus ? (
          <NativeSelect
            className="h-8 w-auto min-w-[120px] text-xs"
            value={room.status}
            onChange={(e) => changeStatus.mutate({ id: room.id, status: e.target.value as RoomStatus })}
          >
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </NativeSelect>
        ) : (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", sc.color)}>{sc.label}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {canCrud && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>}
          <Link to={`/app/${slug}/maintenance`}><Button size="icon" variant="ghost" className="h-8 w-8"><Wrench className="h-3.5 w-3.5" /></Button></Link>
          {canCrud && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => {
                if (window.confirm(`Delete room ${room.name}?`)) deleteRoom.mutate(room.id, { onError: (e) => toast.error(e.message) });
              }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ================================================================== */
/*  Add / Edit dialog                                                 */
/* ================================================================== */

function RoomDialog({ roomTypes, room, onClose }: { roomTypes: RoomTypeRow[]; room?: RoomRow; onClose: () => void }) {
  const create = useCreateRoom();
  const update = useUpdateRoom();
  const isEdit = !!room;

  const [name, setName] = useState(room?.name ?? "");
  const [floor, setFloor] = useState(room?.floor ?? "");
  const [typeId, setTypeId] = useState(room?.room_type_id ?? roomTypes[0]?.id ?? "");
  const [status, setStatus] = useState<RoomStatus>(room?.status ?? "available");
  const isPending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Room name is required."); return; }
    if (!typeId) { toast.error("Select a room type."); return; }

    try {
      if (isEdit) {
        await update.mutateAsync({ id: room.id, name, floor: floor || undefined, room_type_id: typeId, status });
      } else {
        await create.mutateAsync({ name, floor: floor || undefined, room_type_id: typeId, status });
      }
      toast.success(isEdit ? "Room updated." : "Room added.");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <DialogShell title={isEdit ? `Edit room ${room.name}` : "Add room"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="r-name">Room name / number *</Label>
          <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 101" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="r-floor">Floor</Label>
            <Input id="r-floor" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-status">Status</Label>
            <NativeSelect id="r-status" value={status} onChange={(e) => setStatus(e.target.value as RoomStatus)}>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </NativeSelect>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="r-type">Room type *</Label>
          <NativeSelect id="r-type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </NativeSelect>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save" : "Add room"}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}

/* ================================================================== */
/*  Bulk add dialog                                                   */
/* ================================================================== */

function BulkDialog({ roomTypes, onClose }: { roomTypes: RoomTypeRow[]; onClose: () => void }) {
  const bulk = useBulkCreateRooms();
  const [typeId, setTypeId] = useState(roomTypes[0]?.id ?? "");
  const [prefix, setPrefix] = useState("");
  const [start, setStart] = useState("1");
  const [count, setCount] = useState("10");
  const [floorVal, setFloorVal] = useState("1");

  const preview = useMemo(() => {
    const s = Number(start) || 1;
    const c = Math.min(Number(count) || 0, 100);
    return Array.from({ length: c }, (_, i) => `${prefix}${s + i}`);
  }, [prefix, start, count]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeId) { toast.error("Select a room type."); return; }
    if (preview.length === 0) { toast.error("Generate at least one room."); return; }

    try {
      await bulk.mutateAsync(preview.map((name) => ({ name, floor: floorVal, room_type_id: typeId })));
      toast.success(`${preview.length} rooms created.`);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <DialogShell title="Add multiple rooms" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="b-type">Room type *</Label>
          <NativeSelect id="b-type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </NativeSelect>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="b-prefix">Prefix</Label>
            <Input id="b-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g. 1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-start">Start #</Label>
            <Input id="b-start" type="number" min="1" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-count">Count</Label>
            <Input id="b-count" type="number" min="1" max="100" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-floor">Floor</Label>
            <Input id="b-floor" value={floorVal} onChange={(e) => setFloorVal(e.target.value)} placeholder="1" />
          </div>
        </div>

        {preview.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Preview ({preview.length} rooms)</p>
            <div className="flex flex-wrap gap-1.5 rounded-lg bg-muted/50 p-3">
              {preview.slice(0, 30).map((n) => (
                <span key={n} className="rounded-md bg-background px-2 py-0.5 text-xs font-medium">{n}</span>
              ))}
              {preview.length > 30 && <span className="text-xs text-muted-foreground">+{preview.length - 30} more</span>}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={bulk.isPending} className="gap-2">
            {bulk.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create {preview.length} rooms
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}

/* ================================================================== */
/*  Reusable dialog shell                                             */
/* ================================================================== */

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Close">
            <ChevronDown className="h-4 w-4 rotate-90" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
