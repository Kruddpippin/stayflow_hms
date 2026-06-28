import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Hotel, Search, Users, CalendarDays, BedDouble, Loader2,
  Check, Copy, ArrowLeft, ArrowRight, AlertTriangle, MapPin,
} from "lucide-react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface PublicFacility {
  name: string; type: string; description: string | null;
  city: string | null; country: string | null; logo_url: string | null;
  currency: string; check_in_time: string | null; check_out_time: string | null;
  accent_color: string; tax_rate: number;
  public_booking_enabled: boolean; status: string;
  payment_mode?: string; payment_provider?: string; payment_public_key?: string;
  error?: string;
}

interface AvailableType {
  id: string; name: string; description: string | null; max_occupancy: number;
  photos: string[]; plan_name: string | null; plan_price: number | null;
  nights: number; total_price: number; units_available: number;
}

interface BookingResult {
  success: boolean; booking_reference: string;
  room_type: string; check_in: string; check_out: string;
  nights: number; subtotal: number; tax: number; total: number; currency: string;
  error?: string;
}

type Step = "search" | "results" | "details" | "confirmation";

const today = () => format(new Date(), "yyyy-MM-dd");
const tomorrow = () => format(addDays(new Date(), 1), "yyyy-MM-dd");

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function BookingPage() {
  const { facilitySlug } = useParams<{ facilitySlug: string }>();

  const { data: facility, isLoading: facLoading } = useQuery<PublicFacility>({
    queryKey: ["public-facility", facilitySlug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_facility", { p_slug: facilitySlug! });
      if (error) throw error;
      return data as PublicFacility;
    },
  });

  const [step, setStep] = useState<Step>("search");
  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [guests, setGuests] = useState(2);
  const [selectedType, setSelectedType] = useState<AvailableType | null>(null);
  const [booking, setBooking] = useState<BookingResult | null>(null);

  const accent = facility?.accent_color ?? "#0F766E";
  const currency = facility?.currency ?? "NGN";
  const nights = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return 0;
    return differenceInCalendarDays(new Date(checkOut), new Date(checkIn));
  }, [checkIn, checkOut]);

  // Availability query
  const { data: availability = [], isLoading: availLoading, refetch: refetchAvail } = useQuery<AvailableType[]>({
    queryKey: ["availability", facilitySlug, checkIn, checkOut, guests],
    enabled: step === "results" && !!facilitySlug && nights > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_availability", {
        p_slug: facilitySlug!, p_check_in: checkIn, p_check_out: checkOut, p_guests: guests,
      });
      if (error) throw error;
      return (data ?? []) as AvailableType[];
    },
  });

  if (facLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not bookable
  if (!facility || facility.error || !facility.public_booking_enabled || facility.status !== "active") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <Hotel className="h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-xl font-semibold">Booking not available</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Online booking is not currently available for this property.
        </p>
        <Link to="/"><Button variant="outline">Go to StayFlow</Button></Link>
      </div>
    );
  }

  function handleSearch() {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      toast.error("Check-out must be after check-in.");
      return;
    }
    setStep("results");
  }

  function handleSelect(type: AvailableType) {
    setSelectedType(type);
    setStep("details");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: accent }}>
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          {facility.logo_url ? (
            <img src={facility.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <Hotel className="h-[18px] w-[18px] text-white" />
            </div>
          )}
          <span className="text-base font-semibold text-white">{facility.name}</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        {step === "search" && (
          <SearchStep
            facility={facility} accent={accent} checkIn={checkIn} checkOut={checkOut}
            guests={guests} setCheckIn={setCheckIn} setCheckOut={setCheckOut}
            setGuests={setGuests} onSearch={handleSearch}
          />
        )}

        {step === "results" && (
          <ResultsStep
            accent={accent} currency={currency}
            availability={availability} loading={availLoading} nights={nights}
            checkIn={checkIn} checkOut={checkOut} guests={guests}
            onSelect={handleSelect} onBack={() => setStep("search")}
            setCheckIn={setCheckIn} setCheckOut={setCheckOut} setGuests={setGuests}
            onSearch={() => refetchAvail()}
          />
        )}

        {step === "details" && selectedType && (
          <DetailsStep
            facility={facility} accent={accent} currency={currency}
            roomType={selectedType} nights={nights} checkIn={checkIn}
            checkOut={checkOut} guests={guests} slug={facilitySlug!}
            taxRate={facility.tax_rate}
            onBack={() => setStep("results")}
            onSuccess={(b) => { setBooking(b); setStep("confirmation"); }}
          />
        )}

        {step === "confirmation" && booking && (
          <ConfirmationStep
            facility={facility} accent={accent} currency={currency} booking={booking}
            onNewSearch={() => { setStep("search"); setSelectedType(null); setBooking(null); }}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Powered by <Link to="/" className="font-medium text-foreground hover:underline">StayFlow</Link>
      </footer>
    </div>
  );
}

/* ================================================================== */
/*  Search step                                                       */
/* ================================================================== */

function SearchStep({ facility, accent, checkIn, checkOut, guests, setCheckIn, setCheckOut, setGuests, onSearch }: {
  facility: PublicFacility; accent: string;
  checkIn: string; checkOut: string; guests: number;
  setCheckIn: (v: string) => void; setCheckOut: (v: string) => void;
  setGuests: (v: number) => void; onSearch: () => void;
}) {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{facility.name}</h1>
        {(facility.city || facility.country) && (
          <p className="mt-2 flex items-center justify-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4" /> {[facility.city, facility.country].filter(Boolean).join(", ")}
          </p>
        )}
        {facility.description && (
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">{facility.description}</p>
        )}
      </div>

      {/* Search widget */}
      <Card className="mx-auto max-w-2xl rounded-2xl p-6 shadow-lg">
        <h2 className="mb-4 text-center text-lg font-semibold">Check availability</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Check-in</Label>
            <Input type="date" min={today()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            {facility.check_in_time && <p className="text-[11px] text-muted-foreground">From {facility.check_in_time}</p>}
          </div>
          <div className="space-y-2">
            <Label>Check-out</Label>
            <Input type="date" min={checkIn || today()} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            {facility.check_out_time && <p className="text-[11px] text-muted-foreground">By {facility.check_out_time}</p>}
          </div>
          <div className="space-y-2">
            <Label>Guests</Label>
            <Input type="number" min="1" max="20" value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} />
          </div>
        </div>
        <Button className="mt-5 w-full gap-2" size="lg" style={{ backgroundColor: accent }} onClick={onSearch}>
          <Search className="h-4 w-4" /> Search availability
        </Button>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  Results step                                                      */
/* ================================================================== */

function ResultsStep({ accent, currency, availability, loading, nights, checkIn, checkOut, guests, onSelect, onBack, setCheckIn, setCheckOut, setGuests, onSearch }: {
  accent: string; currency: string;
  availability: AvailableType[]; loading: boolean; nights: number;
  checkIn: string; checkOut: string; guests: number;
  onSelect: (t: AvailableType) => void; onBack: () => void;
  setCheckIn: (v: string) => void; setCheckOut: (v: string) => void;
  setGuests: (v: number) => void; onSearch: () => void;
}) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {/* Compact search bar */}
      <Card className="rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 flex-1 min-w-[120px]">
            <Label className="text-xs">Check-in</Label>
            <Input type="date" className="h-9 text-sm" min={today()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="space-y-1 flex-1 min-w-[120px]">
            <Label className="text-xs">Check-out</Label>
            <Input type="date" className="h-9 text-sm" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
          <div className="space-y-1 w-20">
            <Label className="text-xs">Guests</Label>
            <Input type="number" className="h-9 text-sm" min="1" value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} />
          </div>
          <Button size="sm" style={{ backgroundColor: accent }} className="gap-1.5" onClick={onSearch}>
            <Search className="h-3.5 w-3.5" /> Update
          </Button>
        </div>
      </Card>

      <h2 className="text-lg font-semibold">
        {loading ? "Searching…" : `${availability.length} room type${availability.length !== 1 ? "s" : ""} available`}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {format(new Date(checkIn), "MMM d")} → {format(new Date(checkOut), "MMM d")} · {nights} night{nights !== 1 ? "s" : ""}
        </span>
      </h2>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      )}

      {!loading && availability.length === 0 && (
        <Card className="rounded-2xl p-8 text-center">
          <BedDouble className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No rooms available for these dates — try different dates or fewer guests.</p>
        </Card>
      )}

      {!loading && availability.map((type) => (
        <Card key={type.id} className="overflow-hidden rounded-2xl">
          <div className="flex flex-col sm:flex-row">
            {/* Photo */}
            <div className="sm:w-64 shrink-0">
              {type.photos?.[0] ? (
                <img src={type.photos[0]} alt={type.name} className="h-48 w-full object-cover sm:h-full" />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-muted sm:h-full">
                  <BedDouble className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-1 flex-col justify-between p-5">
              <div>
                <h3 className="text-lg font-semibold">{type.name}</h3>
                {type.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{type.description}</p>}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Up to {type.max_occupancy} guests</span>
                  <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {type.units_available} room{type.units_available !== 1 ? "s" : ""} left</span>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {type.plan_name ?? "Standard rate"} · {currency} {Number(type.plan_price ?? 0).toLocaleString()}/night
                  </p>
                  <p className="text-2xl font-bold">{currency} {Number(type.total_price).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">for {nights} night{nights !== 1 ? "s" : ""} · taxes extra</p>
                </div>
                <Button size="lg" style={{ backgroundColor: accent }} className="gap-2 shrink-0" onClick={() => onSelect(type)}>
                  Select <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Details + Review step                                             */
/* ================================================================== */

const guestSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  special_requests: z.string().optional(),
});
type GuestValues = z.infer<typeof guestSchema>;

function DetailsStep({ facility, accent, currency, roomType, nights, checkIn, checkOut, guests, slug, taxRate, onBack, onSuccess }: {
  facility: PublicFacility; accent: string; currency: string;
  roomType: AvailableType; nights: number; checkIn: string; checkOut: string;
  guests: number; slug: string; taxRate: number;
  onBack: () => void; onSuccess: (b: BookingResult) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);

  const subtotal = Number(roomType.total_price);
  const tax = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + tax;

  const { register, handleSubmit, formState: { errors } } = useForm<GuestValues>({
    resolver: zodResolver(guestSchema),
  });

  async function onSubmit(values: GuestValues) {
    setSubmitting(true);
    setAvailError(null);
    try {
      const { data, error } = await supabase.rpc("create_public_booking", {
        p_slug: slug,
        p_payload: {
          check_in: checkIn, check_out: checkOut,
          room_type_id: roomType.id,
          full_name: values.full_name, email: values.email,
          phone: values.phone || null, special_requests: values.special_requests || null,
          adults: guests, children: 0,
        },
      });
      if (error) throw error;
      const result = data as BookingResult;
      if (result.error) {
        if (result.error.toLowerCase().includes("no rooms")) {
          setAvailError(result.error);
        } else {
          toast.error(result.error);
        }
        return;
      }
      onSuccess(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to results
      </button>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Guest form */}
        <div className="lg:col-span-3">
          <Card className="rounded-2xl p-6">
            <h2 className="mb-4 text-lg font-semibold">Your details</h2>
            <form id="booking-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Full name *</Label>
                <Input {...register("full_name")} placeholder="Jane Doe" disabled={submitting} />
                {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" {...register("email")} placeholder="you@email.com" disabled={submitting} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" {...register("phone")} placeholder="+234 800 000 0000" disabled={submitting} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Special requests</Label>
                <Textarea {...register("special_requests")} rows={3} placeholder="Late arrival, extra pillows, etc." disabled={submitting} />
              </div>
            </form>
          </Card>
        </div>

        {/* Booking summary */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 rounded-2xl p-6">
            <h3 className="mb-4 text-base font-semibold">Booking summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span className="font-medium text-right">{facility.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Room type</span><span className="font-medium">{roomType.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span>{format(new Date(checkIn), "MMM d")} → {format(new Date(checkOut), "MMM d")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{nights} night{nights !== 1 ? "s" : ""}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Guests</span><span>{guests}</span></div>
              <hr />
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{currency} {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span>{currency} {tax.toLocaleString()}</span></div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span><span>{currency} {total.toLocaleString()}</span>
              </div>
              {facility.payment_mode === "online_required" ? (
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">Online payment required to confirm booking.</p>
              ) : facility.payment_mode === "online_optional" ? (
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">You can pay now or at the property.</p>
              ) : (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Pay at property — no payment required now.</p>
              )}
            </div>

            {availError && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <p className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> {availError}</p>
                <button onClick={onBack} className="mt-1 text-xs font-medium underline">Search again</button>
              </div>
            )}

            <Button
              form="booking-form"
              type="submit"
              className="mt-5 w-full gap-2"
              size="lg"
              style={{ backgroundColor: accent }}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm booking
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Confirmation step                                                 */
/* ================================================================== */

function ConfirmationStep({ facility, accent, currency, booking, onNewSearch }: {
  facility: PublicFacility; accent: string; currency: string;
  booking: BookingResult; onNewSearch: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyRef() {
    navigator.clipboard.writeText(booking.booking_reference).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accent + "15" }}>
        <Check className="h-8 w-8" style={{ color: accent }} />
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking confirmed!</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your reservation at {facility.name} is confirmed.</p>
      </div>

      {/* Reference */}
      <Card className="rounded-2xl p-6">
        <p className="text-xs text-muted-foreground">Booking reference</p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <p className="text-3xl font-bold tracking-wider">{booking.booking_reference}</p>
          <button onClick={copyRef} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" title="Copy">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Save this reference — you'll need it to manage your booking.</p>
      </Card>

      {/* Summary */}
      <Card className="rounded-2xl p-6 text-left">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span className="font-medium">{facility.name}</span></div>
          {(facility.city || facility.country) && (
            <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{[facility.city, facility.country].filter(Boolean).join(", ")}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted-foreground">Room type</span><span className="font-medium">{booking.room_type}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span>{format(new Date(booking.check_in), "MMM d")} → {format(new Date(booking.check_out), "MMM d, yyyy")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span>{booking.nights} night{booking.nights !== 1 ? "s" : ""}</span></div>
          <hr />
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{currency} {Number(booking.subtotal).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{currency} {Number(booking.tax).toLocaleString()}</span></div>
          <div className="flex justify-between font-bold"><span>Total</span><span>{currency} {Number(booking.total).toLocaleString()}</span></div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Pay at property on arrival.</p>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <Button variant="outline" className="gap-2" onClick={onNewSearch}>
          <CalendarDays className="h-4 w-4" /> Make another booking
        </Button>
      </div>
    </div>
  );
}
