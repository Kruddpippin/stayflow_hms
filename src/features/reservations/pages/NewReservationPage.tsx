import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { differenceInCalendarDays, format } from "date-fns";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, Loader2, CalendarDays, BedDouble, Users, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { GuestPicker } from "@/features/guests/components/GuestPicker";
import { useRoomTypes } from "@/features/rooms/hooks/useRooms";
import { useRatePlans } from "@/features/rooms/hooks/useRoomTypes";
import { useReservation, useAvailableRooms, useSaveReservation } from "../hooks/useReservations";
import type { ReservationSource } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Schema                                                            */
/* ------------------------------------------------------------------ */

const reservationSchema = z.object({
  guest_id: z.string().min(1, "Please select or create a guest."),
  check_in: z.string().min(1, "Check-in date is required."),
  check_out: z.string().min(1, "Check-out date is required."),
  room_type_id: z.string().min(1, "Please select a room type."),
  room_id: z.string().nullable(),
  source: z.string().default("direct"),
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().min(0),
  nightly_rate: z.coerce.number().min(0),
  notes: z.string().nullable(),
}).refine((d) => d.check_out > d.check_in, {
  message: "Check-out must be after check-in.",
  path: ["check_out"],
});

type FormValues = z.infer<typeof reservationSchema>;

const SOURCES: { value: ReservationSource; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "walk_in", label: "Walk-in" },
  { value: "ota", label: "OTA" },
  { value: "phone", label: "Phone" },
];

const today = () => format(new Date(), "yyyy-MM-dd");
const tomorrow = () => format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function NewReservationPage() {
  return (
    <RoleGuard roles={["owner", "manager", "front_desk"]}>
      <ReservationFormContent />
    </RoleGuard>
  );
}

function ReservationFormContent() {
  const { id, facilitySlug } = useParams<{ id?: string; facilitySlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { facility } = useFacility();
  const slug = facilitySlug ?? facility?.slug ?? "";
  const currency = facility?.currency ?? "NGN";
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useReservation(isEdit ? id : undefined);
  const { data: roomTypes = [] } = useRoomTypes();
  const save = useSaveReservation();

  const {
    register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      guest_id: searchParams.get("guest") ?? "",
      check_in: today(),
      check_out: tomorrow(),
      room_type_id: "",
      room_id: null,
      source: "direct",
      adults: 1,
      children: 0,
      nightly_rate: 0,
      notes: null,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (!existing) return;
    setValue("guest_id", existing.guest_id);
    setValue("check_in", existing.check_in);
    setValue("check_out", existing.check_out);
    setValue("room_type_id", existing.room_type_id);
    setValue("room_id", existing.room_id ?? null);
    setValue("source", existing.source);
    setValue("adults", existing.adults);
    setValue("children", existing.children);
    setValue("notes", existing.notes ?? null);
    // Derive nightly rate from total / nights
    const nights = differenceInCalendarDays(new Date(existing.check_out), new Date(existing.check_in));
    setValue("nightly_rate", nights > 0 ? Number(existing.total_amount) / nights : Number(existing.total_amount));
  }, [existing, setValue]);

  const checkIn = watch("check_in");
  const checkOut = watch("check_out");
  const roomTypeId = watch("room_type_id");
  const nightlyRate = watch("nightly_rate");
  const adults = watch("adults");
  const children = watch("children");

  const nights = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return 0;
    return differenceInCalendarDays(new Date(checkOut), new Date(checkIn));
  }, [checkIn, checkOut]);

  const total = nights * (nightlyRate || 0);

  // Room type info
  const selectedType = roomTypes.find((t) => t.id === roomTypeId);

  // Available rooms
  const { data: availData, isLoading: roomsLoading } = useAvailableRooms(
    roomTypeId || null, checkIn, checkOut, isEdit ? id : undefined
  );

  // Rate plans for selected type
  const { data: ratePlans = [] } = useRatePlans(roomTypeId || null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  // Auto-set nightly rate when room type or rate plan changes
  useEffect(() => {
    if (isEdit && existing) return; // Don't override on edit load
    if (selectedPlanId) {
      const plan = ratePlans.find((p) => p.id === selectedPlanId);
      if (plan) setValue("nightly_rate", plan.price);
    } else if (selectedType) {
      setValue("nightly_rate", selectedType.base_rate);
    }
  }, [selectedPlanId, ratePlans, selectedType, setValue, isEdit, existing]);

  // Reset room when type changes
  useEffect(() => {
    setValue("room_id", null);
  }, [roomTypeId, setValue]);

  // Occupancy warning
  const maxOcc = selectedType?.max_occupancy ?? Infinity;
  const occWarning = (Number(adults) + Number(children)) > maxOcc;

  async function onSubmit(values: FormValues) {
    try {
      const result = await save.mutateAsync({
        id: isEdit ? id : undefined,
        guest_id: values.guest_id,
        room_type_id: values.room_type_id,
        room_id: values.room_id || null,
        check_in: values.check_in,
        check_out: values.check_out,
        status: isEdit ? existing?.status : "confirmed",
        source: values.source,
        adults: values.adults,
        children: values.children,
        total_amount: total,
        notes: values.notes || null,
      });

      toast.success(isEdit ? "Reservation updated." : "Reservation created.");
      navigate(`/app/${slug}/reservations/${result.id ?? id}`, { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save reservation.");
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/app/${slug}/reservations`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {isEdit ? "Edit reservation" : "New reservation"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update the booking details." : "Create a new booking for your facility."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 1 — Guest */}
        <Card className="rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-muted-foreground" /> Guest
          </h2>
          <Controller
            control={control}
            name="guest_id"
            render={({ field }) => (
              <GuestPicker
                value={field.value || null}
                onChange={(gid) => field.onChange(gid)}
                onClear={() => field.onChange("")}
              />
            )}
          />
          {errors.guest_id && (
            <p className="mt-2 text-xs text-destructive" role="alert">{errors.guest_id.message}</p>
          )}
        </Card>

        {/* 2 — Stay dates */}
        <Card className="rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-muted-foreground" /> Stay dates
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="check_in">Check-in</Label>
              <Input id="check_in" type="date" {...register("check_in")} />
              {facility?.check_in_time && (
                <p className="text-xs text-muted-foreground">Default time: {facility.check_in_time}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_out">Check-out</Label>
              <Input id="check_out" type="date" {...register("check_out")} />
              {errors.check_out && (
                <p className="text-xs text-destructive" role="alert">{errors.check_out.message}</p>
              )}
              {facility?.check_out_time && (
                <p className="text-xs text-muted-foreground">Default time: {facility.check_out_time}</p>
              )}
            </div>
          </div>
          {nights > 0 && (
            <p className="mt-3 text-sm font-medium text-primary">{nights} night{nights !== 1 ? "s" : ""}</p>
          )}
        </Card>

        {/* 3 — Room */}
        <Card className="rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <BedDouble className="h-4 w-4 text-muted-foreground" /> Room
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_type_id">Room type *</Label>
              <NativeSelect id="room_type_id" {...register("room_type_id")}>
                <option value="">Select a room type…</option>
                {roomTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {currency} {Number(t.base_rate).toLocaleString()}/night
                  </option>
                ))}
              </NativeSelect>
              {errors.room_type_id && (
                <p className="text-xs text-destructive" role="alert">{errors.room_type_id.message}</p>
              )}
            </div>

            {roomTypeId && checkIn && checkOut && checkOut > checkIn && (
              <div className="space-y-2">
                <Label htmlFor="room_id">Specific room (optional)</Label>
                <div className="flex items-center gap-3">
                  <Controller
                    control={control}
                    name="room_id"
                    render={({ field }) => (
                      <NativeSelect
                        id="room_id"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        disabled={roomsLoading}
                      >
                        <option value="">Assign later</option>
                        {availData?.available.map((r) => (
                          <option key={r.id} value={r.id}>
                            Room {r.name}{r.floor ? ` (Floor ${r.floor})` : ""}
                          </option>
                        ))}
                      </NativeSelect>
                    )}
                  />
                  {roomsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {availData && (
                  <p className="text-xs text-muted-foreground">
                    {availData.available.length} of {availData.total} {selectedType?.name ?? ""} rooms free for these dates
                  </p>
                )}
                {availData && availData.available.length === 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" /> No rooms available for these dates.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* 4 — Occupancy & source */}
        <Card className="rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold">Occupancy & source</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="adults">Adults</Label>
              <Input id="adults" type="number" min="1" {...register("adults")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="children">Children</Label>
              <Input id="children" type="number" min="0" {...register("children")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <NativeSelect id="source" {...register("source")}>
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </NativeSelect>
            </div>
          </div>
          {occWarning && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Total guests ({Number(adults) + Number(children)}) exceeds max occupancy ({maxOcc}) for {selectedType?.name}.
            </p>
          )}
        </Card>

        {/* 5 — Rate & total */}
        <Card className="rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold">Rate & total</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ratePlans.length > 0 && (
              <div className="space-y-2">
                <Label>Rate plan</Label>
                <NativeSelect
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="">Base rate</option>
                  {ratePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {currency} {Number(p.price).toLocaleString()}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="nightly_rate">Nightly rate ({currency})</Label>
              <Input id="nightly_rate" type="number" min="0" step="0.01" {...register("nightly_rate")} />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-5 py-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {nights} night{nights !== 1 ? "s" : ""} × {currency} {(nightlyRate || 0).toLocaleString()}
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {currency} {total.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold">Notes</h2>
          <Textarea
            placeholder="Special requests, late arrival, extra bed, etc."
            rows={3}
            {...register("notes")}
          />
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to={`/app/${slug}/reservations`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || save.isPending} className="gap-2" size="lg">
            {(isSubmitting || save.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create reservation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
