import { useState } from "react";
import { Link } from "react-router-dom";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Plus, Pencil, Trash2, Users, BedDouble, Tag,
  Upload, X, Loader2, ChevronDown, ChevronRight, AlertTriangle, Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  useRoomTypesDetail, useCreateRoomType, useUpdateRoomType, useDeleteRoomType,
  useRatePlans, useCreateRatePlan, useUpdateRatePlan, useDeleteRatePlan,
  type RoomTypeDetail, type RatePlanRow,
} from "../hooks/useRoomTypes";

/* ================================================================== */
/*  Page                                                              */
/* ================================================================== */

export default function RoomTypesPage() {
  return (
    <RoleGuard roles={["owner", "manager"]}>
      <RoomTypesContent />
    </RoleGuard>
  );
}

function RoomTypesContent() {
  const { facility } = useFacility();
  const slug = facility?.slug ?? "";
  const { data: types = [], isLoading, isError, refetch } = useRoomTypesDetail();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoomTypeDetail | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load room types.</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">No room types yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Add your first room type to start selling rooms. Rooms and reservations depend on room types.
        </p>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Add room type</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Room Types</h1>
          <p className="text-sm text-muted-foreground">{types.length} type{types.length !== 1 ? "s" : ""}</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Add room type
        </Button>
      </div>

      <div className="space-y-4">
        {types.map((t) => (
          <RoomTypeCard
            key={t.id}
            type={t}
            slug={slug}
            currency={facility?.currency ?? "NGN"}
            onEdit={() => { setEditing(t); setDialogOpen(true); }}
          />
        ))}
      </div>

      {dialogOpen && (
        <RoomTypeDialog
          type={editing}
          currency={facility?.currency ?? "NGN"}
          facilityId={facility?.id ?? ""}
          onClose={() => { setDialogOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  Room type card                                                    */
/* ================================================================== */

function RoomTypeCard({ type, slug, currency, onEdit }: {
  type: RoomTypeDetail; slug: string; currency: string; onEdit: () => void;
}) {
  const deleteType = useDeleteRoomType();
  const [expanded, setExpanded] = useState(false);
  const thumb = type.photos[0];

  function handleDelete() {
    if (!window.confirm(`Delete room type "${type.name}"?`)) return;
    deleteType.mutate(type.id, { onError: (e) => toast.error(e.message) });
  }

  return (
    <Card className="rounded-2xl p-0">
      <div className="flex gap-4 p-5">
        {/* Thumbnail */}
        {thumb ? (
          <img src={thumb} alt={type.name} className="h-20 w-28 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-muted">
            <BedDouble className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">{type.name}</h3>
              {type.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{type.description}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete}>
                {deleteType.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{currency} {Number(type.base_rate).toLocaleString()}<span className="font-normal text-muted-foreground">/night</span></span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {type.max_occupancy} guests</span>
            <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {type.roomCount} / {type.total_units} rooms</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Link to={`/app/${slug}/rooms`}>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"><Plus className="h-3 w-3" /> Add rooms</Button>
            </Link>
            <Button
              size="sm" variant="ghost"
              className="gap-1.5 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              <Tag className="h-3 w-3" /> Rate plans
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Rate plans section */}
      {expanded && (
        <div className="border-t px-5 py-4">
          <RatePlansSection roomTypeId={type.id} baseRate={type.base_rate} currency={currency} />
        </div>
      )}
    </Card>
  );
}

/* ================================================================== */
/*  Rate plans section                                                */
/* ================================================================== */

function RatePlansSection({ roomTypeId, baseRate, currency }: { roomTypeId: string; baseRate: number; currency: string }) {
  const { data: plans = [], isLoading } = useRatePlans(roomTypeId);
  const createPlan = useCreateRatePlan();
  const updatePlan = useUpdateRatePlan();
  const deletePlan = useDeleteRatePlan();
  const [addOpen, setAddOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RatePlanRow | null>(null);

  if (isLoading) return <div className="h-12 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-3">
      {plans.length === 0 && (
        <p className="text-sm text-muted-foreground">No rate plans yet. Add one to define pricing options.</p>
      )}

      {plans.map((p) => {
        const cond = p.conditions;
        const tags: string[] = [];
        if (cond.refundable === true) tags.push("Refundable");
        if (cond.refundable === false) tags.push("Non-refundable");
        if (cond.includes_breakfast) tags.push("Breakfast incl.");
        if (typeof cond.min_nights === "number" && cond.min_nights > 1) tags.push(`Min ${cond.min_nights} nights`);

        return (
          <div key={p.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
            <div>
              <p className="text-sm font-medium">{p.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{currency} {Number(p.price).toLocaleString()}</span>
                {tags.map((t) => <span key={t} className="rounded bg-background px-1.5 py-0.5">{t}</span>)}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingPlan(p)}><Pencil className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => {
                  if (plans.length <= 1) { toast.error("Keep at least one rate plan per room type."); return; }
                  if (window.confirm(`Delete rate plan "${p.name}"?`))
                    deletePlan.mutate({ id: p.id, room_type_id: roomTypeId }, { onError: (e) => toast.error(e.message) });
                }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}

      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAddOpen(true)}>
        <Plus className="h-3 w-3" /> Add rate plan
      </Button>

      {(addOpen || editingPlan) && (
        <RatePlanForm
          roomTypeId={roomTypeId}
          plan={editingPlan}
          defaultPrice={baseRate}
          currency={currency}
          onCreate={createPlan}
          onUpdate={updatePlan}
          onClose={() => { setAddOpen(false); setEditingPlan(null); }}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  Rate plan inline form                                             */
/* ================================================================== */

function RatePlanForm({ roomTypeId, plan, defaultPrice, currency, onCreate, onUpdate, onClose }: {
  roomTypeId: string;
  plan: RatePlanRow | null;
  defaultPrice: number;
  currency: string;
  onCreate: ReturnType<typeof useCreateRatePlan>;
  onUpdate: ReturnType<typeof useUpdateRatePlan>;
  onClose: () => void;
}) {
  const isEdit = !!plan;
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(String(plan?.price ?? defaultPrice));
  const [refundable, setRefundable] = useState<boolean>((plan?.conditions?.refundable as boolean) ?? true);
  const [breakfast, setBreakfast] = useState<boolean>((plan?.conditions?.includes_breakfast as boolean) ?? false);
  const [minNights, setMinNights] = useState(String((plan?.conditions?.min_nights as number) ?? 1));
  const [notes, setNotes] = useState((plan?.conditions?.notes as string) ?? "");
  const isPending = onCreate.isPending || onUpdate.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Rate plan name is required."); return; }

    const conditions: Record<string, unknown> = {
      refundable,
      includes_breakfast: breakfast,
      min_nights: Number(minNights) || 1,
      ...(notes ? { notes } : {}),
    };

    try {
      if (isEdit) {
        await onUpdate.mutateAsync({ id: plan.id, room_type_id: roomTypeId, name, price: Number(price), conditions });
      } else {
        await onCreate.mutateAsync({ room_type_id: roomTypeId, name, price: Number(price), conditions });
      }
      toast.success(isEdit ? "Rate plan updated." : "Rate plan added.");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Name *</Label>
          <Input className="h-9 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard, Non-refundable" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Price ({currency})</Label>
          <Input className="h-9 text-sm" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={refundable} onChange={(e) => setRefundable(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Refundable
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={breakfast} onChange={(e) => setBreakfast(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Breakfast included
        </label>
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">Min nights</Label>
          <Input className="h-8 w-16 text-xs" type="number" min="1" value={minNights} onChange={(e) => setMinNights(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Input className="h-9 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional conditions (optional)" />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  Room type add/edit dialog                                         */
/* ================================================================== */

function RoomTypeDialog({ type, currency, facilityId, onClose }: {
  type: RoomTypeDetail | null; currency: string; facilityId: string; onClose: () => void;
}) {
  const create = useCreateRoomType();
  const update = useUpdateRoomType();
  const isEdit = !!type;

  const [name, setName] = useState(type?.name ?? "");
  const [description, setDescription] = useState(type?.description ?? "");
  const [baseRate, setBaseRate] = useState(String(type?.base_rate ?? ""));
  const [maxOcc, setMaxOcc] = useState(String(type?.max_occupancy ?? 2));
  const [totalUnits, setTotalUnits] = useState(String(type?.total_units ?? 0));
  const [photos, setPhotos] = useState<string[]>(type?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const isPending = create.isPending || update.isPending;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} exceeds 5 MB.`); continue; }
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${facilityId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from("room-type-photos").upload(path, file);
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      const { data } = supabase.storage.from("room-type-photos").getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }

    setPhotos((prev) => [...prev, ...newUrls]);
    setUploading(false);
    e.target.value = "";
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required."); return; }
    if (!baseRate || Number(baseRate) < 0) { toast.error("Base rate is required."); return; }

    const payload = {
      name, description: description || undefined,
      base_rate: Number(baseRate), max_occupancy: Number(maxOcc) || 2,
      total_units: Number(totalUnits) || 0, photos,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id: type.id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      toast.success(isEdit ? "Room type updated." : "Room type created.");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border bg-card shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
          <h2 className="text-base font-semibold">{isEdit ? `Edit ${type.name}` : "Add room type"}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deluxe King" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Room type description (optional)" rows={2} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Base rate ({currency}) *</Label>
              <Input type="number" min="0" step="0.01" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Max occupancy</Label>
              <Input type="number" min="1" value={maxOcc} onChange={(e) => setMaxOcc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total units</Label>
              <Input type="number" min="0" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} />
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((url) => (
                <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:border-primary/40 hover:bg-primary/[0.02]">
                <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
              </label>
            </div>
            <p className="text-xs text-muted-foreground">JPG or PNG, max 5 MB each</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create room type"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
