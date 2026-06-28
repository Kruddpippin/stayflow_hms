import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { PasswordStrengthBar } from "@/components/PasswordStrength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Save, Loader2, Upload, ImageIcon, X, Plus,
  Eye, EyeOff, LogOut, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type { MembershipRole, FacilityType } from "@/types/db";

const ROLE_COLORS: Record<MembershipRole, string> = {
  owner: "bg-violet-100 text-violet-700", manager: "bg-blue-100 text-blue-700",
  front_desk: "bg-emerald-100 text-emerald-700", housekeeping: "bg-amber-100 text-amber-700",
  maintenance: "bg-orange-100 text-orange-700", accountant: "bg-cyan-100 text-cyan-700",
};
const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Owner", manager: "Manager", front_desk: "Front Desk",
  housekeeping: "Housekeeping", maintenance: "Maintenance", accountant: "Accountant",
};
const FAC_ICONS: Record<FacilityType, string> = {
  hotel: "🏨", motel: "🏩", apartment: "🏢", guesthouse: "🏠",
  hostel: "🛏️", resort: "🏖️", bnb: "☕", other: "🏗️",
};

export default function AccountPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Account</h1>
      </div>

      <ProfileSection profile={profile} refreshProfile={refreshProfile} />
      <EmailSection currentEmail={user?.email ?? ""} />
      <PasswordSection />
      <FacilitiesSection />
      <SecuritySection signOut={signOut} />
    </div>
  );
}

/* ---- Profile ---- */

function ProfileSection({ profile, refreshProfile }: { profile: { id: string; full_name: string | null; phone: string | null; avatar_url: string | null } | null; refreshProfile: () => Promise<void> }) {
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2 MB."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${profile.id}/avatar.${ext}`;

    // Ensure bucket exists (it might not yet)
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      // Try creating the bucket on the fly — if RLS blocks this, the avatar upload just won't work
      toast.error("Avatar upload failed. Storage bucket may not be configured.");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: name || null, phone: phone || null, avatar_url: avatarUrl || null,
    }).eq("id", profile!.id);
    if (error) toast.error(error.message);
    else { toast.success("Profile updated."); await refreshProfile(); }
    setSaving(false);
  }

  if (!profile) return null;

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-base font-semibold">Profile</h2>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <div className="relative">
              <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full border object-cover" />
              <button onClick={() => setAvatarUrl("")} className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
          )}
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            <span className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {avatarUrl ? "Change" : "Upload"}
            </span>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <div className="flex justify-end"><Button onClick={handleSave} disabled={saving} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</Button></div>
      </div>
    </Card>
  );
}

/* ---- Email ---- */

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleChange() {
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast.error("Enter a valid email."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast.error(error.message);
    else toast.success("Confirmation email sent to your new address.");
    setSaving(false);
  }

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-base font-semibold">Email</h2>
      <p className="mb-3 text-sm text-muted-foreground">Current: <strong>{currentEmail}</strong></p>
      <div className="flex gap-3">
        <Input placeholder="New email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="max-w-xs" />
        <Button variant="outline" onClick={handleChange} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Change email
        </Button>
      </div>
    </Card>
  );
}

/* ---- Password ---- */

function PasswordSection() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleChange() {
    if (pw.length < 8) { toast.error("Minimum 8 characters."); return; }
    if (pw !== confirm) { toast.error("Passwords don't match."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message);
    else { toast.success("Password updated."); setPw(""); setConfirm(""); }
    setSaving(false);
  }

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-base font-semibold">Password</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>New password</Label>
          <div className="relative max-w-xs">
            <Input type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min. 8 characters" className="pr-10" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrengthBar password={pw} />
        </div>
        <div className="space-y-2">
          <Label>Confirm password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" className="max-w-xs" />
          {confirm && pw !== confirm && <p className="text-xs text-destructive">Passwords don't match.</p>}
        </div>
        <Button variant="outline" onClick={handleChange} disabled={saving || !pw} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update password
        </Button>
      </div>
    </Card>
  );
}

/* ---- My Facilities ---- */

function FacilitiesSection() {
  const { user } = useAuth();
  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ["my-facilities", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("role, facility:facilities(name, slug, type, logo_url)")
        .eq("user_id", user!.id)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).filter((m) => m.facility).map((m) => {
        const f = m.facility as unknown as { name: string; slug: string; type: FacilityType; logo_url: string | null };
        return { role: m.role as MembershipRole, ...f };
      });
    },
  });

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-base font-semibold">My Facilities</h2>
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : (
        <div className="space-y-2">
          {facilities.map((f) => (
            <Link key={f.slug} to={`/app/${f.slug}/dashboard`}
              className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent">
              {f.logo_url ? (
                <img src={f.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">{FAC_ICONS[f.type] ?? "🏗️"}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", ROLE_COLORS[f.role])}>{ROLE_LABELS[f.role]}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          <Link to="/onboarding/create-facility"
            className="flex items-center gap-3 rounded-xl border-2 border-dashed p-3 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed"><Plus className="h-5 w-5" /></div>
            <span className="text-sm font-medium">Create new facility</span>
          </Link>
        </div>
      )}
    </Card>
  );
}

/* ---- Security ---- */

function SecuritySection({ signOut }: { signOut: () => Promise<void> }) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleGlobalSignOut() {
    if (!window.confirm("Sign out of all devices? You'll need to log in again.")) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) { toast.error(error.message); setSigningOut(false); return; }
    await signOut();
  }

  return (
    <Card className="rounded-2xl p-6">
      <h2 className="mb-4 text-base font-semibold">Security</h2>
      <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={handleGlobalSignOut} disabled={signingOut}>
        {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign out everywhere
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">Ends all active sessions across all devices.</p>
    </Card>
  );
}
