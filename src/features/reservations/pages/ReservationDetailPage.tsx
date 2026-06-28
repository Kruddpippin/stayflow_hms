import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { differenceInCalendarDays, format } from "date-fns";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Pencil, LogIn, LogOut as LogOutIcon, XCircle, UserX,
  BedDouble, Users, Mail, Phone, Loader2, AlertTriangle,
  DoorOpen, Receipt, Check, Clock, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useReservation, useAvailableRooms,
  useCheckIn, useCheckOut, useCancel, useNoShow, useAssignRoom,
} from "../hooks/useReservations";
import type { MembershipRole, ReservationStatus } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Status config                                                     */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<ReservationStatus, { label: string; color: string; icon: React.ElementType }> = {
  confirmed:   { label: "Confirmed",   color: "bg-blue-100 text-blue-700",       icon: Check },
  checked_in:  { label: "Checked In",  color: "bg-emerald-100 text-emerald-700", icon: LogIn },
  checked_out: { label: "Checked Out", color: "bg-muted text-muted-foreground",  icon: LogOutIcon },
  cancelled:   { label: "Cancelled",   color: "bg-red-100 text-red-700",         icon: XCircle },
  no_show:     { label: "No-show",     color: "bg-amber-100 text-amber-700",     icon: UserX },
};

const TIMELINE_ORDER: ReservationStatus[] = ["confirmed", "checked_in", "checked_out"];
const CAN_ACT: MembershipRole[] = ["owner", "manager", "front_desk"];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function ReservationDetailPage() {
  return (
    <RoleGuard roles={["owner", "manager", "front_desk", "accountant"]}>
      <DetailContent />
    </RoleGuard>
  );
}

function DetailContent() {
  const { id, facilitySlug } = useParams<{ id: string; facilitySlug: string }>();
  const { facility, role } = useFacility();
  const slug = facilitySlug ?? facility?.slug ?? "";
  const currency = facility?.currency ?? "NGN";
  const canAct = role ? CAN_ACT.includes(role) : false;

  const { data: res, isLoading, isError } = useReservation(id);

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const cancel = useCancel();
  const noShow = useNoShow();
  const assignRoom = useAssignRoom();

  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const anyPending = checkIn.isPending || checkOut.isPending || cancel.isPending || noShow.isPending || assignRoom.isPending;

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }

  if (isError || !res) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Reservation not found.</p>
        <Link to={`/app/${slug}/reservations`}><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
      </div>
    );
  }

  const status = res.status as ReservationStatus;
  const sm = STATUS_META[status];
  const nights = differenceInCalendarDays(new Date(res.check_out), new Date(res.check_in));
  const guestName = res.guest?.full_name ?? "Guest";
  const isClosed = ["checked_out", "cancelled", "no_show"].includes(status);

  function handleCheckIn(roomId?: string) {
    checkIn.mutate(
      { reservationId: res!.id, roomId },
      { onSuccess: () => { toast.success("Guest checked in."); setAssignOpen(false); }, onError: (e) => toast.error(e.message) }
    );
  }

  function handleCheckOut() {
    checkOut.mutate(res!.id, {
      onSuccess: () => toast.success("Guest checked out. Room marked for cleaning."),
      onError: (e) => toast.error(e.message),
    });
  }

  function handleCancel() {
    cancel.mutate(
      { reservationId: res!.id, reason: cancelReason || undefined },
      { onSuccess: () => { toast.success("Reservation cancelled."); setCancelOpen(false); }, onError: (e) => toast.error(e.message) }
    );
  }

  function handleNoShow() {
    if (!window.confirm(`Mark ${guestName} as no-show?`)) return;
    noShow.mutate(res!.id, {
      onSuccess: () => toast.success("Marked as no-show."),
      onError: (e) => toast.error(e.message),
    });
  }

  function handleAssignRoom(roomId: string) {
    assignRoom.mutate(
      { reservationId: res!.id, roomId },
      { onSuccess: () => { toast.success("Room assigned."); setAssignOpen(false); }, onError: (e) => toast.error(e.message) }
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link to={`/app/${slug}/reservations`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Reservations
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{guestName}</h1>
            <span className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium", sm.color)}>
              <sm.icon className="h-3.5 w-3.5" /> {sm.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(res.check_in), "MMM d")} → {format(new Date(res.check_out), "MMM d, yyyy")} · {nights} night{nights !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Primary lifecycle action */}
        {canAct && (
          <div className="flex gap-2">
            {status === "confirmed" && (
              <>
                <Button
                  className="gap-2"
                  disabled={anyPending}
                  onClick={() => {
                    if (res.room_id) handleCheckIn();
                    else setAssignOpen(true);
                  }}
                >
                  {checkIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Check in
                </Button>
                <Button variant="outline" size="sm" disabled={anyPending} onClick={handleNoShow}>
                  <UserX className="h-4 w-4" />
                </Button>
              </>
            )}
            {status === "checked_in" && (
              <Button className="gap-2" disabled={anyPending} onClick={handleCheckOut}>
                {checkOut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOutIcon className="h-4 w-4" />}
                Check out
              </Button>
            )}
            {!isClosed && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={anyPending}
                onClick={() => setCancelOpen(true)}>
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Guest */}
      <Card className="rounded-2xl p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-muted-foreground" /> Guest</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <Link to={`/app/${slug}/guests/${res.guest_id}`} className="font-medium text-primary hover:underline">{guestName}</Link>
          {res.guest?.email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{res.guest.email}</span>}
          {res.guest?.phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{res.guest.phone}</span>}
        </div>
      </Card>

      {/* Stay */}
      <Card className="rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><BedDouble className="h-4 w-4 text-muted-foreground" /> Stay details</h3>
          {canAct && !isClosed && (
            <Link to={`/app/${slug}/reservations/${id}/edit`}>
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs"><Pencil className="h-3 w-3" /> Edit</Button>
            </Link>
          )}
        </div>
        <div className="grid gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Room type" value={res.room_type?.name ?? "—"} />
          <Row label="Room" value={res.room ? `Room ${res.room.name}` : "Unassigned"}>
            {canAct && !isClosed && (
              <Button size="sm" variant="ghost" className="ml-2 h-6 px-2 text-[11px]" onClick={() => setAssignOpen(true)}>
                <DoorOpen className="mr-1 h-3 w-3" />{res.room_id ? "Change" : "Assign"}
              </Button>
            )}
          </Row>
          <Row label="Guests" value={`${res.adults} adult${res.adults !== 1 ? "s" : ""}${res.children > 0 ? `, ${res.children} child${res.children !== 1 ? "ren" : ""}` : ""}`} />
          <Row label="Source" value={res.source.replace("_", " ")} />
          <Row label="Rate" value={`${currency} ${(Number(res.total_amount) / (nights || 1)).toLocaleString()} / night`} />
          <Row label="Total" value={`${currency} ${Number(res.total_amount).toLocaleString()}`} bold />
        </div>
        {res.notes && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Notes: </span>{res.notes}
          </div>
        )}
      </Card>

      {/* Status timeline */}
      <Card className="rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-muted-foreground" /> Timeline</h3>
        <div className="space-y-0">
          {TIMELINE_ORDER.map((step, i) => {
            const isActive = status === step;
            const isPast = TIMELINE_ORDER.indexOf(status) > i || (["cancelled", "no_show"].includes(status) && i === 0);
            const sm2 = STATUS_META[step];
            return (
              <div key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
                    isActive ? "border-primary bg-primary text-primary-foreground" :
                    isPast ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground/40"
                  )}>
                    <sm2.icon className="h-3.5 w-3.5" />
                  </div>
                  {i < TIMELINE_ORDER.length - 1 && <div className={cn("w-0.5 flex-1 my-1", isPast || isActive ? "bg-primary" : "bg-border")} />}
                </div>
                <div className="pb-4">
                  <p className={cn("text-sm font-medium", isActive ? "text-foreground" : isPast ? "text-foreground" : "text-muted-foreground")}>{sm2.label}</p>
                  {isActive && <p className="text-xs text-muted-foreground">Current status</p>}
                </div>
              </div>
            );
          })}
          {["cancelled", "no_show"].includes(status) && (() => {
            const Icon = STATUS_META[status].icon;
            return (
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-destructive bg-destructive/10 text-destructive">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div><p className="text-sm font-medium text-destructive">{STATUS_META[status].label}</p></div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Billing */}
      <Card className="rounded-2xl p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Receipt className="h-4 w-4 text-muted-foreground" /> Billing</h3>
        <div className="grid gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Total" value={`${currency} ${Number(res.total_amount).toLocaleString()}`} bold />
          <Row label="Invoice" value="Invoice management coming in next prompt" />
        </div>
      </Card>

      {/* Assign room dialog */}
      {assignOpen && (
        <AssignRoomDialog
          reservationId={res.id}
          roomTypeId={res.room_type_id}
          checkIn={res.check_in}
          checkOut={res.check_out}
          currentRoomId={res.room_id}
          status={status}
          onAssign={handleAssignRoom}
          onCheckInWithRoom={(roomId) => handleCheckIn(roomId)}
          assigning={assignRoom.isPending || checkIn.isPending}
          onClose={() => setAssignOpen(false)}
        />
      )}

      {/* Cancel dialog */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setCancelOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
            <h2 className="text-base font-semibold">Cancel reservation</h2>
            <p className="mt-1 text-sm text-muted-foreground">This will free the assigned room and mark the booking as cancelled.</p>
            <div className="mt-4 space-y-2">
              <Label>Reason (optional)</Label>
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Guest requested cancellation" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep booking</Button>
              <Button variant="destructive" disabled={cancel.isPending} className="gap-2" onClick={handleCancel}>
                {cancel.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Cancel reservation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function Row({ label, value, bold, children }: { label: string; value: string; bold?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("capitalize", bold && "font-semibold")}>{value}</span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Assign room dialog                                                */
/* ------------------------------------------------------------------ */

function AssignRoomDialog({ reservationId, roomTypeId, checkIn, checkOut, currentRoomId, status, onAssign, onCheckInWithRoom, assigning, onClose }: {
  reservationId: string; roomTypeId: string; checkIn: string; checkOut: string;
  currentRoomId: string | null; status: string;
  onAssign: (roomId: string) => void; onCheckInWithRoom: (roomId: string) => void;
  assigning: boolean; onClose: () => void;
}) {
  const { data: availData, isLoading } = useAvailableRooms(roomTypeId, checkIn, checkOut, reservationId);
  const [selected, setSelected] = useState(currentRoomId ?? "");
  const isConfirmed = status === "confirmed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">{isConfirmed && !currentRoomId ? "Assign room & check in" : "Assign room"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <NativeSelect value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Select a room…</option>
              {availData?.available.map((r) => (
                <option key={r.id} value={r.id}>Room {r.name}{r.floor ? ` (Floor ${r.floor})` : ""}</option>
              ))}
            </NativeSelect>
            {availData && (
              <p className="mt-2 text-xs text-muted-foreground">{availData.available.length} of {availData.total} rooms available</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {isConfirmed && !currentRoomId ? (
                <Button disabled={!selected || assigning} className="gap-2" onClick={() => onCheckInWithRoom(selected)}>
                  {assigning && <Loader2 className="h-4 w-4 animate-spin" />} Assign & check in
                </Button>
              ) : (
                <Button disabled={!selected || assigning} className="gap-2" onClick={() => onAssign(selected)}>
                  {assigning && <Loader2 className="h-4 w-4 animate-spin" />} Assign room
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
