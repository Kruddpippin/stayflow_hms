import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  LogIn, LogOut as LogOutIcon, ChevronLeft, ChevronRight,
  Users, BedDouble, ExternalLink, Loader2, UserPlus,
  AlertTriangle, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCheckIn, useCheckOut, useAvailableRooms, useAssignRoom } from "@/features/reservations/hooks/useReservations";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface FrontDeskRow {
  id: string;
  guest_id: string;
  room_type_id: string;
  room_id: string | null;
  check_in: string;
  check_out: string;
  status: string;
  adults: number;
  children: number;
  total_amount: number;
  source: string;
  guest: { full_name: string; email: string | null; phone: string | null } | null;
  room_type: { id: string; name: string } | null;
  room: { id: string; name: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function FrontDeskPage() {
  return (
    <RoleGuard roles={["owner", "manager", "front_desk"]}>
      <FrontDeskContent />
    </RoleGuard>
  );
}

function FrontDeskContent() {
  const { facility } = useFacility();
  const slug = facility?.slug ?? "";
  const currency = facility?.currency ?? "NGN";
  const fid = facility?.id;

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [tab, setTab] = useState<"arrivals" | "departures" | "in-house">("arrivals");

  // Fetch all reservations relevant to the selected date
  const { data: rows = [], isLoading, isError, refetch } = useQuery<FrontDeskRow[]>({
    queryKey: ["front-desk", fid, selectedDate],
    enabled: !!fid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, guest_id, room_type_id, room_id, check_in, check_out, status, adults, children, total_amount, source, guest:guests(full_name, email, phone), room_type:room_types(id, name), room:rooms(id, name)")
        .eq("facility_id", fid!)
        .or(`check_in.eq.${selectedDate},check_out.eq.${selectedDate},status.eq.checked_in`);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        guest: r.guest as unknown as FrontDeskRow["guest"],
        room_type: r.room_type as unknown as FrontDeskRow["room_type"],
        room: r.room as unknown as FrontDeskRow["room"],
      }));
    },
  });

  const arrivals = useMemo(() =>
    rows.filter((r) => r.check_in === selectedDate && ["confirmed", "checked_in"].includes(r.status)),
    [rows, selectedDate]
  );
  const departures = useMemo(() =>
    rows.filter((r) => r.check_out === selectedDate && r.status === "checked_in"),
    [rows, selectedDate]
  );
  const inHouse = useMemo(() =>
    rows.filter((r) => r.status === "checked_in"),
    [rows]
  );

  const arrivalsConfirmed = arrivals.filter((r) => r.status === "confirmed").length;
  const arrivalsCheckedIn = arrivals.filter((r) => r.status === "checked_in").length;

  function shiftDate(days: number) {
    setSelectedDate((d) => format(days > 0 ? addDays(new Date(d), days) : subDays(new Date(d), Math.abs(days)), "yyyy-MM-dd"));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Front Desk</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date selector */}
          <Button size="icon" variant="outline" onClick={() => shiftDate(-1)} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="date" className="h-9 w-auto text-sm" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <Button size="icon" variant="outline" onClick={() => shiftDate(1)} aria-label="Next day"><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}>Today</Button>

          {/* Walk-in */}
          <Link to={`/app/${slug}/reservations/new?source=walk_in&check_in=${selectedDate}&check_out=${format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd")}`}>
            <Button className="gap-2"><UserPlus className="h-4 w-4" /> Walk-in</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {([
          { key: "arrivals" as const, label: "Arrivals", count: arrivals.length, icon: LogIn },
          { key: "departures" as const, label: "Departures", count: departures.length, icon: LogOutIcon },
          { key: "in-house" as const, label: "In-house", count: inHouse.length, icon: Users },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className={cn("rounded-full px-2 py-0.5 text-xs",
              tab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">Failed to load front desk data.</p>
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && tab === "arrivals" && (
        <ArrivalsTab rows={arrivals} slug={slug} currency={currency} confirmedCount={arrivalsConfirmed} checkedInCount={arrivalsCheckedIn} selectedDate={selectedDate} />
      )}
      {!isLoading && !isError && tab === "departures" && (
        <DeparturesTab rows={departures} slug={slug} currency={currency} selectedDate={selectedDate} />
      )}
      {!isLoading && !isError && tab === "in-house" && (
        <InHouseTab rows={inHouse} slug={slug} currency={currency} />
      )}
    </div>
  );
}

/* ================================================================== */
/*  Arrivals tab                                                      */
/* ================================================================== */

function ArrivalsTab({ rows, slug, currency, confirmedCount, checkedInCount, selectedDate }: {
  rows: FrontDeskRow[]; slug: string; currency: string; confirmedCount: number; checkedInCount: number; selectedDate: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyTab icon={LogIn} message={`No arrivals for ${format(new Date(selectedDate), "MMM d, yyyy")}.`} />
    );
  }

  return (
    <div className="space-y-3">
      {confirmedCount > 0 && (
        <p className="text-xs text-muted-foreground">{confirmedCount} pending · {checkedInCount} checked in</p>
      )}
      {rows.map((r) => (
        <ArrivalCard key={r.id} row={r} slug={slug} currency={currency} />
      ))}
    </div>
  );
}

function ArrivalCard({ row, slug, currency }: { row: FrontDeskRow; slug: string; currency: string }) {
  const checkIn = useCheckIn();
  const assignRoom = useAssignRoom();
  const isCheckedIn = row.status === "checked_in";
  const [assigning, setAssigning] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(row.room_id ?? "");

  const { data: availData, isLoading: roomsLoading } = useAvailableRooms(
    !row.room_id && assigning ? row.room_type_id : null,
    row.check_in, row.check_out, row.id
  );

  const nights = Math.max(1, Math.ceil((new Date(row.check_out).getTime() - new Date(row.check_in).getTime()) / 86400000));
  const isPending = checkIn.isPending || assignRoom.isPending;

  function handleCheckIn() {
    if (!row.room_id && !selectedRoom) {
      setAssigning(true);
      return;
    }
    const roomId = row.room_id ?? selectedRoom;
    checkIn.mutate(
      { reservationId: row.id, roomId: roomId || undefined },
      { onSuccess: () => toast.success(`${row.guest?.full_name} checked in.`), onError: (e) => toast.error(e.message) }
    );
  }

  function handleAssignAndCheckIn() {
    if (!selectedRoom) { toast.error("Select a room first."); return; }
    checkIn.mutate(
      { reservationId: row.id, roomId: selectedRoom },
      { onSuccess: () => { toast.success(`${row.guest?.full_name} checked in.`); setAssigning(false); }, onError: (e) => toast.error(e.message) }
    );
  }

  return (
    <Card className={cn("rounded-2xl p-5", isCheckedIn && "border-emerald-200 bg-emerald-50/30")}>
      <div className="flex flex-wrap items-center gap-4">
        {/* Guest info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{row.guest?.full_name ?? "Guest"}</p>
            {isCheckedIn && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <Check className="h-3 w-3" /> Checked in
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{row.room_type?.name ?? "—"}{row.room ? ` · Room ${row.room.name}` : ""}</span>
            <span>{nights} night{nights !== 1 ? "s" : ""}</span>
            <span>{row.adults + row.children} guest{row.adults + row.children !== 1 ? "s" : ""}</span>
            <span className="font-medium text-foreground">{currency} {Number(row.total_amount).toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link to={`/app/${slug}/reservations/${row.id}`}>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="View details"><ExternalLink className="h-3.5 w-3.5" /></Button>
          </Link>
          {!isCheckedIn && (
            <Button className="gap-2" disabled={isPending} onClick={handleCheckIn}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Check in
            </Button>
          )}
        </div>
      </div>

      {/* Inline room assignment */}
      {assigning && !row.room_id && !isCheckedIn && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex-1">
            <p className="mb-1.5 text-xs font-medium">Assign a room to check in</p>
            <div className="flex items-center gap-2">
              <NativeSelect className="h-9 text-sm" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} disabled={roomsLoading}>
                <option value="">Select room…</option>
                {availData?.available.map((r) => (
                  <option key={r.id} value={r.id}>Room {r.name}{r.floor ? ` (Floor ${r.floor})` : ""}</option>
                ))}
              </NativeSelect>
              {roomsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {availData && <p className="mt-1 text-[11px] text-muted-foreground">{availData.available.length} of {availData.total} available</p>}
          </div>
          <Button disabled={!selectedRoom || isPending} className="gap-1.5" onClick={handleAssignAndCheckIn}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Assign & check in
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ================================================================== */
/*  Departures tab                                                    */
/* ================================================================== */

function DeparturesTab({ rows, slug, currency, selectedDate }: {
  rows: FrontDeskRow[]; slug: string; currency: string; selectedDate: string;
}) {
  if (rows.length === 0) {
    return <EmptyTab icon={LogOutIcon} message={`No departures for ${format(new Date(selectedDate), "MMM d, yyyy")}.`} />;
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <DepartureCard key={r.id} row={r} slug={slug} currency={currency} />
      ))}
    </div>
  );
}

function DepartureCard({ row, slug, currency }: { row: FrontDeskRow; slug: string; currency: string }) {
  const checkOutMut = useCheckOut();

  function handleCheckOut() {
    if (!window.confirm(`Check out ${row.guest?.full_name}? The room will be marked for cleaning.`)) return;
    checkOutMut.mutate(row.id, {
      onSuccess: () => toast.success(`${row.guest?.full_name} checked out. Room marked for cleaning.`),
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <Card className="rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{row.guest?.full_name ?? "Guest"}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{row.room_type?.name}{row.room ? ` · Room ${row.room.name}` : ""}</span>
            <span className="font-medium text-foreground">{currency} {Number(row.total_amount).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/app/${slug}/reservations/${row.id}`}>
            <Button size="icon" variant="ghost" className="h-8 w-8" title="View details"><ExternalLink className="h-3.5 w-3.5" /></Button>
          </Link>
          <Button variant="outline" className="gap-2" disabled={checkOutMut.isPending} onClick={handleCheckOut}>
            {checkOutMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOutIcon className="h-4 w-4" />}
            Check out
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  In-house tab                                                      */
/* ================================================================== */

function InHouseTab({ rows, slug, currency }: { rows: FrontDeskRow[]; slug: string; currency: string }) {
  if (rows.length === 0) {
    return <EmptyTab icon={Users} message="No guests currently in-house." />;
  }

  return (
    <Card className="rounded-2xl p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Guest</th>
              <th className="px-4 py-3 font-medium">Room</th>
              <th className="px-4 py-3 font-medium">Check-out</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{r.guest?.full_name ?? "Guest"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.room_type?.name}{r.room ? ` · ${r.room.name}` : ""}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{format(new Date(r.check_out), "MMM d")}</td>
                <td className="px-4 py-3 text-right font-medium">{currency} {Number(r.total_amount).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link to={`/app/${slug}/reservations/${r.id}`}>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-xs"><ExternalLink className="h-3 w-3" /> View</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Empty state                                                       */
/* ================================================================== */

function EmptyTab({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
