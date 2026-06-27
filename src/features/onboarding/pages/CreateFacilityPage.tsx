import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import {
  Hotel, Building2, Home, Coffee, Warehouse, TreePalm, BedDouble,
  LayoutGrid, ArrowLeft, ArrowRight, Loader2, Check, Plus, Trash2,
  Pencil, Upload, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FacilityType } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const FACILITY_TYPES: { value: FacilityType; label: string; icon: React.ElementType }[] = [
  { value: "hotel", label: "Hotel", icon: Hotel },
  { value: "motel", label: "Motel", icon: Building2 },
  { value: "apartment", label: "Serviced Apartments", icon: Warehouse },
  { value: "guesthouse", label: "Guesthouse", icon: Home },
  { value: "hostel", label: "Hostel", icon: BedDouble },
  { value: "resort", label: "Resort", icon: TreePalm },
  { value: "bnb", label: "Bed & Breakfast", icon: Coffee },
  { value: "other", label: "Other", icon: LayoutGrid },
];

const CURRENCIES = [
  "NGN", "USD", "EUR", "GBP", "KES", "ZAR", "GHS", "TZS", "UGX", "RWF",
  "EGP", "MAD", "XOF", "XAF", "CAD", "AUD", "INR", "AED",
];

const TIMEZONES = [
  "Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Johannesburg",
  "Africa/Cairo", "Africa/Casablanca", "Africa/Dar_es_Salaam", "Africa/Kampala",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Toronto",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore",
];

const COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Tanzania", "Uganda", "Rwanda",
  "Ethiopia", "Cameroon", "Senegal", "Egypt", "Morocco", "Ivory Coast",
  "United Kingdom", "United States", "Canada", "France", "Germany",
  "United Arab Emirates", "India", "Other",
];

interface RoomTypeRow {
  name: string;
  base_rate: string;
  max_occupancy: string;
  total_units: string;
}

interface WizardData {
  type: FacilityType | "";
  name: string;
  description: string;
  currency: string;
  timezone: string;
  check_in_time: string;
  check_out_time: string;
  slug: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  logoFile: File | null;
  logoPreview: string;
  roomTypes: RoomTypeRow[];
}

const INITIAL: WizardData = {
  type: "", name: "", description: "", currency: "NGN", timezone: "Africa/Lagos",
  check_in_time: "14:00", check_out_time: "11:00", slug: "",
  address_line1: "", address_line2: "", city: "", state: "", country: "Nigeria",
  phone: "", email: "", logoFile: null, logoPreview: "",
  roomTypes: [],
};

const TOTAL_STEPS = 5;

/* ------------------------------------------------------------------ */
/*  Slug helper                                                       */
/* ------------------------------------------------------------------ */

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

/* ------------------------------------------------------------------ */
/*  Validation helpers                                                */
/* ------------------------------------------------------------------ */

function validateStep(step: number, d: WizardData): string | null {
  if (step === 1 && !d.type) return "Pick a facility type to continue.";
  if (step === 2) {
    if (!d.name.trim()) return "Facility name is required.";
    if (d.name.trim().length < 2) return "Name must be at least 2 characters.";
  }
  if (step === 4) {
    for (const rt of d.roomTypes) {
      if (!rt.name.trim()) return "Every room type needs a name.";
      if (Number(rt.base_rate) < 0) return "Rate cannot be negative.";
      if (Number(rt.max_occupancy) < 1) return "Max occupancy must be at least 1.";
      if (Number(rt.total_units) < 0) return "Total units cannot be negative.";
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function CreateFacilityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patch = useCallback((updates: Partial<WizardData>) => {
    setData((d) => ({ ...d, ...updates }));
    setStepError(null);
  }, []);

  function goNext() {
    const err = validateStep(step, data);
    if (err) { setStepError(err); return; }

    if (step === 2 && !data.slug) {
      patch({ slug: toSlug(data.name) || `facility-${randomSuffix()}` });
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  function goToStep(s: number) {
    setStepError(null);
    setStep(s);
  }

  /* ---- Submit ---- */
  async function handleCreate() {
    if (!user) return;
    setSubmitting(true);
    let orgId: string | null = null;

    try {
      // Build a unique slug — always append a short suffix to avoid
      // conflicts hidden by RLS (other users' orgs are invisible).
      const base = toSlug(data.name) || "facility";
      let slug = `${base}-${randomSuffix()}`;

      // Try inserting the organization; retry once with a new suffix on conflict
      let org: { id: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: row, error: err } = await supabase
          .from("organizations")
          .insert({ name: data.name, slug, owner_id: user.id })
          .select("id").single();
        if (!err) { org = row; break; }
        if (err.code === "23505") { slug = `${base}-${randomSuffix()}`; continue; }
        throw err;
      }
      if (!org) throw new Error("Could not generate a unique workspace URL. Try a different name.");
      orgId = org.id;

      // 2 — Facility (uses the same unique slug)
      const { data: facility, error: facErr } = await supabase
        .from("facilities")
        .insert({
          organization_id: org.id, name: data.name, slug,
          type: data.type as FacilityType, status: "setup",
          currency: data.currency, timezone: data.timezone,
          check_in_time: data.check_in_time, check_out_time: data.check_out_time,
          description: data.description || null,
          address_line1: data.address_line1 || null,
          address_line2: data.address_line2 || null,
          city: data.city || null, state: data.state || null,
          country: data.country || null,
          phone: data.phone || null, email: data.email || null,
        })
        .select("id, slug").single();
      if (facErr) throw facErr;

      // Upload logo if provided
      if (data.logoFile) {
        const ext = data.logoFile.name.split(".").pop() ?? "png";
        const path = `${facility.id}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("facility-logos").upload(path, data.logoFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("facility-logos").getPublicUrl(path);
          await supabase.from("facilities")
            .update({ logo_url: urlData.publicUrl }).eq("id", facility.id);
        }
      }

      // 3 — Owner membership
      const { error: memErr } = await supabase
        .from("memberships")
        .insert({ facility_id: facility.id, user_id: user.id, role: "owner", status: "active" });
      if (memErr) throw memErr;

      // 4 — Room types + rooms
      for (let i = 0; i < data.roomTypes.length; i++) {
        const rt = data.roomTypes[i];
        if (!rt.name.trim()) continue;

        const { data: rtRow, error: rtErr } = await supabase
          .from("room_types")
          .insert({
            facility_id: facility.id, name: rt.name,
            base_rate: Number(rt.base_rate) || 0,
            max_occupancy: Number(rt.max_occupancy) || 2,
            total_units: Number(rt.total_units) || 0,
          })
          .select("id").single();
        if (rtErr) throw rtErr;

        const units = Number(rt.total_units) || 0;
        if (units > 0) {
          const floorPrefix = (i + 1) * 100;
          const rooms = Array.from({ length: units }, (_, j) => ({
            facility_id: facility.id,
            room_type_id: rtRow.id,
            name: String(floorPrefix + j + 1),
            floor: String(i + 1),
            status: "available" as const,
          }));
          const { error: roomErr } = await supabase.from("rooms").insert(rooms);
          if (roomErr) throw roomErr;
        }
      }

      // 5 — Navigate
      navigate(`/app/${facility.slug}/dashboard?welcome=1`, { replace: true });
    } catch (err: unknown) {
      // Rollback: deleting the org cascades to facility, memberships, rooms, etc.
      if (orgId) {
        await supabase.from("organizations").delete().eq("id", orgId);
      }
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- Render ---- */
  return (
    <div className="relative min-h-screen bg-muted/30">
      {/* Creating overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Creating your facility…</p>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">StayFlow</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-primary" : i === step - 1 ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        {step === 1 && <StepType data={data} patch={patch} />}
        {step === 2 && <StepBasics data={data} patch={patch} />}
        {step === 3 && <StepLocation data={data} patch={patch} />}
        {step === 4 && <StepRoomTypes data={data} patch={patch} />}
        {step === 5 && <StepReview data={data} goToStep={goToStep} />}

        {stepError && (
          <p className="mt-4 text-center text-sm text-destructive" role="alert">
            {stepError}
          </p>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={goBack}
            disabled={step === 1 || submitting}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {step < TOTAL_STEPS ? (
            <Button className="gap-2" onClick={goNext} disabled={submitting}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="gap-2" onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create facility
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  STEP 1 — Facility type                                            */
/* ================================================================== */

function StepType({ data, patch }: { data: WizardData; patch: (u: Partial<WizardData>) => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">
        What kind of facility are you setting up?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This helps us tailor room types, housekeeping defaults, and more.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FACILITY_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => patch({ type: value })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-colors",
              data.type === value
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/60 bg-card hover:border-primary/40"
            )}
          >
            <Icon className="h-7 w-7" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  STEP 2 — Basics                                                   */
/* ================================================================== */

function StepBasics({ data, patch }: { data: WizardData; patch: (u: Partial<WizardData>) => void }) {
  function handleNameChange(name: string) {
    patch({ name, slug: toSlug(name) || data.slug });
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Facility details</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us about your property.
      </p>

      <Card className="mt-6 rounded-2xl border-border/60 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fac-name">Facility name *</Label>
            <Input
              id="fac-name"
              value={data.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Grand Lagos Hotel"
            />
            {data.slug && (
              <p className="text-xs text-muted-foreground">
                Workspace URL: <span className="font-mono text-foreground">/app/{data.slug}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fac-desc">Description</Label>
            <Textarea
              id="fac-desc"
              value={data.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="A brief description of your property (optional)"
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fac-currency">Currency</Label>
              <NativeSelect
                id="fac-currency"
                value={data.currency}
                onChange={(e) => patch({ currency: e.target.value })}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fac-tz">Timezone</Label>
              <NativeSelect
                id="fac-tz"
                value={data.timezone}
                onChange={(e) => patch({ timezone: e.target.value })}
              >
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fac-cin">Default check-in time</Label>
              <Input
                id="fac-cin"
                type="time"
                value={data.check_in_time}
                onChange={(e) => patch({ check_in_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fac-cout">Default check-out time</Label>
              <Input
                id="fac-cout"
                type="time"
                value={data.check_out_time}
                onChange={(e) => patch({ check_out_time: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  STEP 3 — Location & contact                                       */
/* ================================================================== */

function StepLocation({ data, patch }: { data: WizardData; patch: (u: Partial<WizardData>) => void }) {
  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB.");
      return;
    }
    patch({ logoFile: file, logoPreview: URL.createObjectURL(file) });
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Location & contact</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Where is your facility and how can guests reach you?
      </p>

      <Card className="mt-6 rounded-2xl border-border/60 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fac-addr1">Address line 1</Label>
            <Input id="fac-addr1" value={data.address_line1}
              onChange={(e) => patch({ address_line1: e.target.value })}
              placeholder="123 Victoria Island Blvd" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fac-addr2">Address line 2</Label>
            <Input id="fac-addr2" value={data.address_line2}
              onChange={(e) => patch({ address_line2: e.target.value })}
              placeholder="Suite, floor, building (optional)" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fac-city">City</Label>
              <Input id="fac-city" value={data.city}
                onChange={(e) => patch({ city: e.target.value })} placeholder="Lagos" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fac-state">State / Region</Label>
              <Input id="fac-state" value={data.state}
                onChange={(e) => patch({ state: e.target.value })} placeholder="Lagos" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fac-country">Country</Label>
              <NativeSelect id="fac-country" value={data.country}
                onChange={(e) => patch({ country: e.target.value })}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fac-phone">Phone</Label>
              <Input id="fac-phone" type="tel" value={data.phone}
                onChange={(e) => patch({ phone: e.target.value })} placeholder="+234 800 000 0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fac-email">Email</Label>
              <Input id="fac-email" type="email" value={data.email}
                onChange={(e) => patch({ email: e.target.value })} placeholder="info@yourhotel.com" />
            </div>
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {data.logoPreview ? (
                <img src={data.logoPreview} alt="Logo preview"
                  className="h-14 w-14 rounded-lg border object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed bg-muted/50">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
                <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  {data.logoFile ? "Change" : "Upload"}
                </span>
              </label>
              <p className="text-xs text-muted-foreground">PNG or JPG, max 2 MB</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  STEP 4 — Room types                                               */
/* ================================================================== */

const EMPTY_RT: RoomTypeRow = { name: "", base_rate: "", max_occupancy: "2", total_units: "0" };

function StepRoomTypes({ data, patch }: { data: WizardData; patch: (u: Partial<WizardData>) => void }) {
  function add() {
    if (data.roomTypes.length >= 10) return;
    patch({ roomTypes: [...data.roomTypes, { ...EMPTY_RT }] });
  }

  function remove(idx: number) {
    patch({ roomTypes: data.roomTypes.filter((_, i) => i !== idx) });
  }

  function update(idx: number, field: keyof RoomTypeRow, value: string) {
    const next = data.roomTypes.map((rt, i) => i === idx ? { ...rt, [field]: value } : rt);
    patch({ roomTypes: next });
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Room types</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your room types now, or skip and do it later from the dashboard.
      </p>

      <div className="mt-6 space-y-4">
        {data.roomTypes.map((rt, i) => (
          <Card key={i} className="rounded-2xl border-border/60 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Room type {i + 1}</span>
              <Button variant="ghost" size="icon" onClick={() => remove(i)}
                aria-label="Remove room type">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`rt-name-${i}`}>Name *</Label>
                <Input id={`rt-name-${i}`} value={rt.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  placeholder="e.g. Standard, Deluxe" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`rt-rate-${i}`}>Base rate</Label>
                <Input id={`rt-rate-${i}`} type="number" min="0" step="0.01"
                  value={rt.base_rate} onChange={(e) => update(i, "base_rate", e.target.value)}
                  placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`rt-occ-${i}`}>Max guests</Label>
                <Input id={`rt-occ-${i}`} type="number" min="1"
                  value={rt.max_occupancy} onChange={(e) => update(i, "max_occupancy", e.target.value)} />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor={`rt-units-${i}`}>Number of rooms to create</Label>
              <Input id={`rt-units-${i}`} type="number" min="0" className="max-w-[140px]"
                value={rt.total_units} onChange={(e) => update(i, "total_units", e.target.value)} />
              {Number(rt.total_units) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Rooms will be auto-named {(i + 1) * 100 + 1}–{(i + 1) * 100 + Number(rt.total_units)}
                </p>
              )}
            </div>
          </Card>
        ))}

        {data.roomTypes.length < 10 && (
          <Button variant="outline" className="w-full gap-2" onClick={add}>
            <Plus className="h-4 w-4" /> Add room type
          </Button>
        )}

        {data.roomTypes.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No room types added yet. You can add them later from the dashboard.
          </p>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  STEP 5 — Review                                                   */
/* ================================================================== */

function StepReview({ data, goToStep }: { data: WizardData; goToStep: (s: number) => void }) {
  const typeLabel = FACILITY_TYPES.find((t) => t.value === data.type)?.label ?? data.type;

  function Section({ title, step: s, children }: { title: string; step: number; children: React.ReactNode }) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={() => goToStep(s)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        {children}
      </div>
    );
  }

  function Row({ label, value }: { label: string; value: string | undefined | null }) {
    return (
      <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-right font-medium">{value || "—"}</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">Review & create</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirm everything looks right, then create your facility.
      </p>

      <div className="mt-6 space-y-4">
        <Section title="Facility type" step={1}>
          <p className="text-sm font-medium">{typeLabel}</p>
        </Section>

        <Section title="Details" step={2}>
          <Row label="Name" value={data.name} />
          <Row label="Slug" value={`/app/${data.slug}`} />
          <Row label="Currency" value={data.currency} />
          <Row label="Timezone" value={data.timezone} />
          <Row label="Check-in" value={data.check_in_time} />
          <Row label="Check-out" value={data.check_out_time} />
          {data.description && <Row label="Description" value={data.description} />}
        </Section>

        <Section title="Location & contact" step={3}>
          {(data.address_line1 || data.city || data.country) ? (
            <Row label="Address" value={[data.address_line1, data.city, data.state, data.country].filter(Boolean).join(", ")} />
          ) : (
            <p className="text-sm text-muted-foreground">No address provided</p>
          )}
          <Row label="Phone" value={data.phone} />
          <Row label="Email" value={data.email} />
          {data.logoFile && <Row label="Logo" value={data.logoFile.name} />}
        </Section>

        <Section title="Room types" step={4}>
          {data.roomTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">None — you can add them later.</p>
          ) : (
            <div className="space-y-2">
              {data.roomTypes.map((rt, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-medium">{rt.name}</span>
                  <span className="text-muted-foreground">
                    {data.currency} {Number(rt.base_rate).toLocaleString()} · {rt.max_occupancy} guests · {rt.total_units} rooms
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
