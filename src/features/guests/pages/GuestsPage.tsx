import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFacility } from "@/components/providers/FacilityProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Users, Loader2, AlertTriangle, Pencil, Trash2,
  ArrowUpDown, Mail, Phone, X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useGuests, useCreateGuest, useUpdateGuest, useDeleteGuest, type GuestRow } from "../hooks/useGuests";
import type { MembershipRole } from "@/types/db";

const CAN_WRITE: MembershipRole[] = ["owner", "manager", "front_desk"];

type SortKey = "full_name" | "last_stay";
type SortDir = "asc" | "desc";

export default function GuestsPage() {
  const { facility, role } = useFacility();
  const slug = facility?.slug ?? "";
  const currency = facility?.currency ?? "NGN";
  const canWrite = role ? CAN_WRITE.includes(role) : false;
  const { data: guests = [], isLoading, isError, refetch } = useGuests();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GuestRow | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    let list = guests;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.full_name.toLowerCase().includes(q) ||
          g.email?.toLowerCase().includes(q) ||
          g.phone?.includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "full_name") return a.full_name.localeCompare(b.full_name) * dir;
      const aDate = a.last_stay ?? "";
      const bDate = b.last_stay ?? "";
      return aDate.localeCompare(bDate) * dir;
    });
    return list;
  }, [guests, search, sortKey, sortDir]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load guests.</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Users className="h-10 w-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">No guests yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          They'll appear here as you take bookings, or add one manually.
        </p>
        {canWrite && (
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add guest
          </Button>
        )}
      </div>
    );
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button className="flex items-center gap-1 font-medium" onClick={() => toggleSort(field)}>
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sortKey === field ? "text-foreground" : "text-muted-foreground/40")} />
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Guests</h1>
          <p className="text-sm text-muted-foreground">{guests.length} guest{guests.length !== 1 ? "s" : ""}</p>
        </div>
        {canWrite && (
          <Button className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Add guest
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, email, or phone…" className="h-9 pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="rounded-2xl p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3"><SortHeader label="Name" field="full_name" /></th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Nationality</th>
                <th className="px-4 py-3 font-medium text-center">Stays</th>
                <th className="px-4 py-3"><SortHeader label="Last stay" field="last_stay" /></th>
                <th className="px-4 py-3 font-medium text-right">Total spent</th>
                {canWrite && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((g) => (
                <tr key={g.id} className="group hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link to={`/app/${slug}/guests/${g.id}`} className="font-medium hover:text-primary hover:underline">
                      {g.full_name}
                    </Link>
                    {g.tags.length > 0 && (
                      <div className="mt-0.5 flex gap-1">
                        {g.tags.map((t) => (
                          <span key={t} className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                            t.toLowerCase() === "vip" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                          )}>{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="space-y-0.5">
                      {g.email && <p className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{g.email}</p>}
                      {g.phone && <p className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{g.phone}</p>}
                      {!g.email && !g.phone && <span className="text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{g.nationality ?? "—"}</td>
                  <td className="px-4 py-3 text-center">{g.stay_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {g.last_stay ? format(new Date(g.last_stay), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {g.total_spent > 0 ? `${currency} ${g.total_spent.toLocaleString()}` : "—"}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(g); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <DeleteGuestButton guestId={g.id} guestName={g.full_name} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && guests.length > 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No guests match your search.</div>
        )}
      </Card>

      {dialogOpen && (
        <GuestDialog guest={editing} onClose={() => { setDialogOpen(false); setEditing(null); }} />
      )}
    </div>
  );
}

/* ---- Delete button ---- */

function DeleteGuestButton({ guestId, guestName }: { guestId: string; guestName: string }) {
  const del = useDeleteGuest();
  return (
    <Button
      size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
      disabled={del.isPending}
      onClick={() => {
        if (window.confirm(`Delete ${guestName}?`))
          del.mutate(guestId, { onError: (e) => toast.error(e.message) });
      }}
    >
      {del.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}

/* ---- Add/Edit dialog ---- */

function GuestDialog({ guest, onClose }: { guest: GuestRow | null; onClose: () => void }) {
  const create = useCreateGuest();
  const update = useUpdateGuest();
  const isEdit = !!guest;

  const [fullName, setFullName] = useState(guest?.full_name ?? "");
  const [email, setEmail] = useState(guest?.email ?? "");
  const [phone, setPhone] = useState(guest?.phone ?? "");
  const [idDoc, setIdDoc] = useState(guest?.id_document ?? "");
  const [nationality, setNationality] = useState(guest?.nationality ?? "");
  const [notes, setNotes] = useState(guest?.notes ?? "");
  const [tagsStr, setTagsStr] = useState((guest?.tags ?? []).join(", "));
  const isPending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("Full name is required."); return; }

    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      if (isEdit) {
        await update.mutateAsync({
          id: guest.id, full_name: fullName,
          email: email || null, phone: phone || null,
          id_document: idDoc || null, nationality: nationality || null,
          notes: notes || null, tags,
        });
      } else {
        await create.mutateAsync({
          full_name: fullName, email: email || undefined,
          phone: phone || undefined, id_document: idDoc || undefined,
          nationality: nationality || undefined, notes: notes || undefined, tags,
        });
      }
      toast.success(isEdit ? "Guest updated." : "Guest added.");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">{isEdit ? `Edit ${guest.full_name}` : "Add guest"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Full name *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guest@email.com" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>ID document</Label><Input value={idDoc} onChange={(e) => setIdDoc(e.target.value)} placeholder="Passport / ID number" /></div>
            <div className="space-y-2"><Label>Nationality</Label><Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Nigerian" /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferences, allergies, etc." rows={2} /></div>
          <div className="space-y-2"><Label>Tags</Label><Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="VIP, Corporate (comma-separated)" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Add guest"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
