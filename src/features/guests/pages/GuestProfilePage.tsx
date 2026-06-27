import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useFacility } from "@/components/providers/FacilityProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Pencil, Plus, Mail, Phone, Globe, CreditCard,
  CalendarDays, BedDouble, Loader2, AlertTriangle, Save, User,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useGuest, useGuestReservations, useGuestTotals, useUpdateGuest } from "../hooks/useGuests";
import type { MembershipRole } from "@/types/db";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700",
};

const CAN_WRITE: MembershipRole[] = ["owner", "manager", "front_desk"];

export default function GuestProfilePage() {
  const { guestId, facilitySlug } = useParams<{ guestId: string; facilitySlug: string }>();
  const { facility, role } = useFacility();
  const slug = facilitySlug ?? facility?.slug ?? "";
  const currency = facility?.currency ?? "NGN";
  const canWrite = role ? CAN_WRITE.includes(role) : false;

  const { data: guest, isLoading, isError } = useGuest(guestId);
  const { data: reservations = [], isLoading: resLoading } = useGuestReservations(guestId);
  const { data: totals } = useGuestTotals(guestId);
  const updateGuest = useUpdateGuest();

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }

  if (isError || !guest) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Guest not found.</p>
        <Link to={`/app/${slug}/guests`}><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to guests</Button></Link>
      </div>
    );
  }

  function startEditNotes() {
    setNotesValue(guest!.notes ?? "");
    setEditingNotes(true);
  }

  async function saveNotes() {
    await updateGuest.mutateAsync({ id: guest!.id, notes: notesValue || null });
    setEditingNotes(false);
    toast.success("Notes updated.");
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to={`/app/${slug}/guests`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All guests
      </Link>

      {/* Header card */}
      <Card className="rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{guest.full_name}</h1>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {guest.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{guest.email}</span>}
                {guest.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{guest.phone}</span>}
                {guest.nationality && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{guest.nationality}</span>}
                {guest.id_document && <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />{guest.id_document}</span>}
              </div>
              {(guest.tags as string[])?.length > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {(guest.tags as string[]).map((t: string) => (
                    <span key={t} className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase",
                      t.toLowerCase() === "vip" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                    )}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canWrite && (
              <Link to={`/app/${slug}/reservations/new?guest=${guest.id}`}>
                <Button className="gap-2"><Plus className="h-4 w-4" /> New reservation</Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      {totals && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-3 rounded-2xl p-5">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total stays</p>
              <p className="text-lg font-semibold">{totals.stays}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 rounded-2xl p-5">
            <BedDouble className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total nights</p>
              <p className="text-lg font-semibold">{totals.nights}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 rounded-2xl p-5">
            <CreditCard className="h-5 w-5 text-violet-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total spent</p>
              <p className="text-lg font-semibold">{currency} {totals.totalSpent.toLocaleString()}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Notes */}
      <Card className="rounded-2xl p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Notes</h3>
          {canWrite && !editingNotes && (
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={startEditNotes}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} rows={3} placeholder="Guest preferences, special requests…" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>Cancel</Button>
              <Button size="sm" disabled={updateGuest.isPending} className="gap-1.5" onClick={saveNotes}>
                {updateGuest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{guest.notes || "No notes."}</p>
        )}
      </Card>

      {/* Stay history */}
      <Card className="rounded-2xl p-0">
        <div className="border-b px-5 py-4">
          <h3 className="text-sm font-semibold">Stay history</h3>
        </div>
        {resLoading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : reservations.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No stays on record yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Dates</th>
                  <th className="px-5 py-3 font-medium">Room</th>
                  <th className="px-5 py-3 font-medium">Guests</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reservations.map((r) => {
                  const ci = new Date(r.check_in);
                  const co = new Date(r.check_out);
                  const nights = Math.max(0, Math.ceil((co.getTime() - ci.getTime()) / 86400000));
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <Link to={`/app/${slug}/reservations/${r.id}`} className="hover:text-primary hover:underline">
                          {format(ci, "MMM d")} → {format(co, "MMM d, yyyy")}
                        </Link>
                        <p className="text-xs text-muted-foreground">{nights} night{nights !== 1 ? "s" : ""}</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {r.room_type?.name ?? "—"}{r.room ? ` · ${r.room.name}` : ""}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{r.adults + r.children}</td>
                      <td className="px-5 py-3">
                        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_COLORS[r.status] ?? "bg-muted text-muted-foreground")}>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium">{currency} {Number(r.total_amount).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
