import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Save, Loader2, Upload, X, ImageIcon, AlertTriangle, Trash2, PauseCircle, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Facility, FacilityType } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const FACILITY_TYPES: { value: FacilityType; label: string }[] = [
  { value: "hotel", label: "Hotel" }, { value: "motel", label: "Motel" },
  { value: "apartment", label: "Serviced Apartments" }, { value: "guesthouse", label: "Guesthouse" },
  { value: "hostel", label: "Hostel" }, { value: "resort", label: "Resort" },
  { value: "bnb", label: "Bed & Breakfast" }, { value: "other", label: "Other" },
];

const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "KES", "ZAR", "GHS", "TZS", "UGX", "RWF", "EGP", "MAD", "CAD", "AUD", "INR", "AED"];
const TIMEZONES = [
  "Africa/Lagos", "Africa/Accra", "Africa/Nairobi", "Africa/Johannesburg", "Africa/Cairo",
  "Africa/Casablanca", "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore",
];
const COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Tanzania", "Uganda", "Rwanda", "Ethiopia",
  "Cameroon", "Egypt", "Morocco", "United Kingdom", "United States", "Canada", "France",
  "Germany", "United Arab Emirates", "India", "Other",
];

type Section = "general" | "location" | "policies" | "branding" | "payments" | "danger";

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  return (
    <RoleGuard roles={["owner", "manager"]}>
      <SettingsContent />
    </RoleGuard>
  );
}

function SettingsContent() {
  const { facility, role } = useFacility();
  const isOwner = role === "owner";
  const [section, setSection] = useState<Section>("general");

  if (!facility) return null;

  const sections: { key: Section; label: string; ownerOnly?: boolean }[] = [
    { key: "general", label: "General" },
    { key: "location", label: "Location & Contact" },
    { key: "policies", label: "Policies & Tax" },
    { key: "branding", label: "Branding" },
    { key: "payments", label: "Online Payments" },
    { key: "danger", label: "Danger Zone", ownerOnly: true },
  ];

  return (
    <div className="flex gap-6">
      {/* Sub-nav */}
      <nav className="hidden w-48 shrink-0 lg:block">
        <ul className="space-y-1 sticky top-20">
          {sections.filter((s) => !s.ownerOnly || isOwner).map((s) => (
            <li key={s.key}>
              <button
                onClick={() => setSection(s.key)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  section === s.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                )}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile tabs */}
      <div className="flex-1 space-y-6">
        <div className="flex gap-1 overflow-x-auto border-b lg:hidden">
          {sections.filter((s) => !s.ownerOnly || isOwner).map((s) => (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
                section === s.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}>
              {s.label}
            </button>
          ))}
        </div>

        {section === "general" && <GeneralSection facility={facility} />}
        {section === "location" && <LocationSection facility={facility} />}
        {section === "policies" && <PoliciesSection facility={facility} />}
        {section === "branding" && <BrandingSection facility={facility} />}
        {section === "payments" && <PaymentsSection facility={facility} />}
        {section === "danger" && isOwner && <DangerSection facility={facility} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared save hook                                                  */
/* ------------------------------------------------------------------ */

function useSaveFacility() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("facilities").update(updates).eq("id", facility!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facility"] });
      // Reload facility in provider
      window.dispatchEvent(new Event("facility-updated"));
    },
  });
}

/* ================================================================== */
/*  General                                                           */
/* ================================================================== */

function GeneralSection({ facility }: { facility: Facility }) {
  const save = useSaveFacility();
  const [name, setName] = useState(facility.name as string);
  const [type, setType] = useState(facility.type as string);
  const [description, setDescription] = useState((facility.description as string) ?? "");
  const [currency, setCurrency] = useState(facility.currency as string);
  const [timezone, setTimezone] = useState(facility.timezone as string);
  const [checkIn, setCheckIn] = useState((facility.check_in_time as string) ?? "14:00");
  const [checkOut, setCheckOut] = useState((facility.check_out_time as string) ?? "11:00");
  const [logoUrl, setLogoUrl] = useState((facility.logo_url as string) ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2 MB."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${facility.id}/logo.${ext}`;
    const { error } = await supabase.storage.from("facility-logos").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("facility-logos").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    setUploading(false);
  }

  function handleSave() {
    if (!name.trim()) { toast.error("Name is required."); return; }
    save.mutate({
      name, type, description: description || null, currency, timezone,
      check_in_time: checkIn, check_out_time: checkOut, logo_url: logoUrl || null,
    }, { onSuccess: () => toast.success("General settings saved.") });
  }

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">General</h2>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Facility name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Type</Label><NativeSelect value={type} onChange={(e) => setType(e.target.value)}>{FACILITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</NativeSelect></div>
          <div className="space-y-2"><Label>Currency</Label><NativeSelect value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</NativeSelect>
            <p className="text-[11px] text-muted-foreground">Changing currency affects formatting only — it doesn't convert historical amounts.</p>
          </div>
        </div>
        <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label>Timezone</Label><NativeSelect value={timezone} onChange={(e) => setTimezone(e.target.value)}>{TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}</NativeSelect></div>
          <div className="space-y-2"><Label>Check-in time</Label><Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div>
          <div className="space-y-2"><Label>Check-out time</Label><Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
        </div>
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative">
                <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded-lg border object-cover" />
                <button onClick={() => setLogoUrl("")} className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
            )}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {logoUrl ? "Replace" : "Upload"}
              </span>
            </label>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Location                                                          */
/* ================================================================== */

function LocationSection({ facility }: { facility: Facility }) {
  const save = useSaveFacility();
  const [addr1, setAddr1] = useState((facility.address_line1 as string) ?? "");
  const [addr2, setAddr2] = useState((facility.address_line2 as string) ?? "");
  const [city, setCity] = useState((facility.city as string) ?? "");
  const [state, setState] = useState((facility.state as string) ?? "");
  const [country, setCountry] = useState((facility.country as string) ?? "Nigeria");
  const [phone, setPhone] = useState((facility.phone as string) ?? "");
  const [email, setEmail] = useState((facility.email as string) ?? "");

  function handleSave() {
    save.mutate({
      address_line1: addr1 || null, address_line2: addr2 || null,
      city: city || null, state: state || null, country: country || null,
      phone: phone || null, email: email || null,
    }, { onSuccess: () => toast.success("Location settings saved.") });
  }

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">Location & Contact</h2>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Address line 1</Label><Input value={addr1} onChange={(e) => setAddr1(e.target.value)} /></div>
        <div className="space-y-2"><Label>Address line 2</Label><Input value={addr2} onChange={(e) => setAddr2(e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
          <div className="space-y-2"><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
          <div className="space-y-2"><Label>Country</Label><NativeSelect value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</NativeSelect></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Policies & Tax                                                    */
/* ================================================================== */

function PoliciesSection({ facility }: { facility: Facility }) {
  const save = useSaveFacility();
  const settings = (facility.settings as Record<string, unknown>) ?? {};
  const [taxRate, setTaxRate] = useState(String(settings.tax_rate ?? "7.5"));
  const [cancellation, setCancellation] = useState((settings.cancellation_policy as string) ?? "");
  const [deposit, setDeposit] = useState((settings.deposit_policy as string) ?? "");
  const [child, setChild] = useState((settings.child_policy as string) ?? "");
  const [pet, setPet] = useState((settings.pet_policy as string) ?? "");

  function handleSave() {
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) { toast.error("Tax rate must be 0–100%."); return; }
    save.mutate({
      settings: {
        ...settings,
        tax_rate: rate,
        cancellation_policy: cancellation || null,
        deposit_policy: deposit || null,
        child_policy: child || null,
        pet_policy: pet || null,
      },
    }, { onSuccess: () => toast.success("Policies saved.") });
  }

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">Policies & Tax</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tax / VAT rate (%)</Label>
          <Input type="number" min="0" max="100" step="0.1" className="max-w-[140px]" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">Applied to all new invoices. Currently {taxRate}%.</p>
        </div>
        <div className="space-y-2"><Label>Cancellation policy</Label><Textarea value={cancellation} onChange={(e) => setCancellation(e.target.value)} rows={3} placeholder="e.g. Free cancellation up to 24h before check-in…" /></div>
        <div className="space-y-2"><Label>Deposit policy</Label><Input value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="e.g. 30% deposit required on booking" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Child policy</Label><Input value={child} onChange={(e) => setChild(e.target.value)} placeholder="e.g. Children under 5 stay free" /></div>
          <div className="space-y-2"><Label>Pet policy</Label><Input value={pet} onChange={(e) => setPet(e.target.value)} placeholder="e.g. No pets allowed" /></div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Branding                                                          */
/* ================================================================== */

function BrandingSection({ facility }: { facility: Facility }) {
  const save = useSaveFacility();
  const settings = (facility.settings as Record<string, unknown>) ?? {};
  const [accent, setAccent] = useState((settings.accent_color as string) ?? "#0F766E");
  const [footerNote, setFooterNote] = useState((settings.invoice_footer as string) ?? "");
  const [displayName, setDisplayName] = useState((settings.display_name as string) ?? "");

  function handleSave() {
    save.mutate({
      settings: { ...settings, accent_color: accent, invoice_footer: footerNote || null, display_name: displayName || null },
    }, { onSuccess: () => toast.success("Branding saved.") });
  }

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">Branding</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Accent color</Label>
          <div className="flex items-center gap-3">
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-14 cursor-pointer rounded-md border p-1" />
            <Input value={accent} onChange={(e) => setAccent(e.target.value)} className="max-w-[140px] font-mono text-sm" />
          </div>
          <p className="text-[11px] text-muted-foreground">Used on guest-facing invoice headers.</p>
        </div>
        <div className="space-y-2"><Label>Public display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="If different from the internal name" /></div>
        <div className="space-y-2"><Label>Invoice footer note</Label><Textarea value={footerNote} onChange={(e) => setFooterNote(e.target.value)} rows={3} placeholder="e.g. Bank details, thank-you note, payment terms…" /></div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Payments                                                          */
/* ================================================================== */

function PaymentsSection({ facility }: { facility: Facility }) {
  const save = useSaveFacility();
  const settings = (facility.settings as Record<string, unknown>) ?? {};
  const [mode, setMode] = useState((settings.payment_mode as string) ?? "pay_at_property");
  const [provider, setProvider] = useState((settings.payment_provider as string) ?? "paystack");
  const [publicKey, setPublicKey] = useState((settings.payment_public_key as string) ?? "");
  const [bookingEnabled, setBookingEnabled] = useState(facility.public_booking_enabled ?? false);

  function handleSave() {
    save.mutate({
      public_booking_enabled: bookingEnabled,
      settings: {
        ...settings,
        payment_mode: mode,
        payment_provider: provider,
        payment_public_key: publicKey || null,
      },
    }, { onSuccess: () => toast.success("Payment settings saved.") });
  }

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-lg font-semibold">Online Payments & Booking</h2>
      <div className="space-y-4">
        <label className="flex items-center gap-3 rounded-lg border p-4">
          <input type="checkbox" checked={bookingEnabled} onChange={(e) => setBookingEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-input" />
          <div>
            <p className="text-sm font-medium">Enable public booking page</p>
            <p className="text-xs text-muted-foreground">Guests can book at /book/{facility.slug}</p>
          </div>
        </label>

        <div className="space-y-2">
          <Label>Payment mode</Label>
          <NativeSelect value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="pay_at_property">Pay at property only</option>
            <option value="online_optional">Online payment optional</option>
            <option value="online_required">Online payment required</option>
          </NativeSelect>
        </div>

        {mode !== "pay_at_property" && (
          <>
            <div className="space-y-2">
              <Label>Payment provider</Label>
              <NativeSelect value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="paystack">Paystack</option>
                <option value="stripe">Stripe</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Public key</Label>
              <Input value={publicKey} onChange={(e) => setPublicKey(e.target.value)}
                placeholder={provider === "paystack" ? "pk_test_..." : "pk_test_..."} />
              <p className="text-[11px] text-muted-foreground">
                Your {provider === "paystack" ? "Paystack" : "Stripe"} public/publishable key. Secret key must be set in the Edge Function environment.
              </p>
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Danger zone                                                       */
/* ================================================================== */

function DangerSection({ facility }: { facility: Facility }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isSuspended = facility.status === "suspended";
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const toggleSuspend = useMutation({
    mutationFn: async () => {
      const newStatus = isSuspended ? "active" : "suspended";
      const { error } = await supabase.from("facilities").update({ status: newStatus }).eq("id", facility.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facility"] });
      toast.success(isSuspended ? "Facility re-activated." : "Facility suspended.");
      window.dispatchEvent(new Event("facility-updated"));
    },
  });

  async function handleDelete() {
    if (confirmName !== facility.name) { toast.error("Name doesn't match."); return; }
    setDeleting(true);
    try {
      // Delete org cascades to facility, memberships, rooms, etc.
      const { error: orgErr } = await supabase.from("facilities").delete().eq("id", facility.id);
      if (orgErr) throw orgErr;
      toast.success("Facility deleted.");
      navigate("/onboarding", { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="rounded-2xl border-destructive/30 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-destructive">
        <AlertTriangle className="h-5 w-5" /> Danger Zone
      </h2>
      <div className="space-y-6">
        {/* Suspend */}
        <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
          <div>
            <p className="text-sm font-medium">{isSuspended ? "Re-activate facility" : "Suspend facility"}</p>
            <p className="text-xs text-muted-foreground">
              {isSuspended
                ? "Re-activate to resume normal operations."
                : "Suspending blocks operations but preserves all data. Reversible."}
            </p>
          </div>
          <Button
            variant={isSuspended ? "default" : "outline"}
            className="gap-2 shrink-0"
            disabled={toggleSuspend.isPending}
            onClick={() => {
              if (!isSuspended && !window.confirm("Suspend this facility? Staff will lose access to operations.")) return;
              toggleSuspend.mutate();
            }}
          >
            {toggleSuspend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> :
              isSuspended ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
            {isSuspended ? "Re-activate" : "Suspend"}
          </Button>
        </div>

        {/* Delete */}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Delete facility</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Permanently delete <strong>{facility.name}</strong> and all its data (rooms, reservations, invoices, staff memberships). This cannot be undone.
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type <strong>{facility.name}</strong> to confirm</Label>
              <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={facility.name} className="max-w-xs" />
            </div>
            <Button
              variant="destructive"
              className="gap-2"
              disabled={confirmName !== facility.name || deleting}
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete facility permanently
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
