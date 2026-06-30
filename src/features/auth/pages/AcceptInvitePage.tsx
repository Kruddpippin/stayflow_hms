import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordStrengthBar } from "@/components/PasswordStrength";
import {
  Hotel, Loader2, AlertTriangle, CheckCircle2, LogOut,
  Clock, XCircle, Eye, EyeOff, ShieldAlert,
  Building2, Home, Coffee, Warehouse, BedDouble, LayoutGrid, TreePalm,
} from "lucide-react";
import { toast } from "sonner";
import type { FacilityType, MembershipRole } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const FACILITY_ICONS: Record<FacilityType, React.ElementType> = {
  hotel: Hotel, motel: Building2, apartment: Warehouse, guesthouse: Home,
  hostel: BedDouble, resort: TreePalm, bnb: Coffee, other: LayoutGrid,
};

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Owner", manager: "Manager", front_desk: "Front Desk",
  housekeeping: "Housekeeping", maintenance: "Maintenance", accountant: "Accountant",
};

const ROLE_COLORS: Record<MembershipRole, string> = {
  owner: "bg-violet-100 text-violet-700",
  manager: "bg-blue-100 text-blue-700",
  front_desk: "bg-emerald-100 text-emerald-700",
  housekeeping: "bg-amber-100 text-amber-700",
  maintenance: "bg-orange-100 text-orange-700",
  accountant: "bg-cyan-100 text-cyan-700",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InviteData {
  id: string;
  facility_id: string;
  email: string;
  role: MembershipRole;
  token: string;
  status: string;
  expires_at: string;
  facility_name: string;
  facility_slug: string;
  facility_type: FacilityType;
  facility_logo_url: string | null;
}

type PageState =
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "used" }
  | { kind: "expired" }
  | { kind: "setup"; invite: InviteData }          // new user — show onboarding form
  | { kind: "wrong_email"; invite: InviteData }    // logged in with wrong email
  | { kind: "confirm_email"; invite: InviteData }  // signed up, awaiting email confirm
  | { kind: "accepting" }
  | { kind: "done"; facilityName: string };

const setupSchema = z.object({
  full_name: z.string().min(2, "Enter your full name (at least 2 characters)"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type SetupValues = z.infer<typeof setupSchema>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function acceptInvite(invite: InviteData, userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("facility_id", invite.facility_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error: memErr } = await supabase
      .from("memberships")
      .insert({ facility_id: invite.facility_id, user_id: userId, role: invite.role, status: "active" });
    if (memErr) throw memErr;
  }

  const { error: invErr } = await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invite.id);
  if (invErr) throw invErr;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, user, signOut, loading: authLoading } = useAuth();
  const [state, setState] = useState<PageState>({ kind: "loading" });

  /* ---- Load invitation ---- */
  useEffect(() => {
    if (!token) { setState({ kind: "not_found" }); return; }
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, facility_id, email, role, token, status, expires_at, facility:facilities(name, slug, type, logo_url)")
        .eq("token", token)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) { setState({ kind: "not_found" }); return; }

      const fac = data.facility as unknown as { name: string; slug: string; type: FacilityType; logo_url: string | null } | null;
      if (!fac) { setState({ kind: "not_found" }); return; }

      const invite: InviteData = {
        id: data.id, facility_id: data.facility_id, email: data.email,
        role: data.role as MembershipRole, token: data.token,
        status: data.status, expires_at: data.expires_at,
        facility_name: fac.name, facility_slug: fac.slug,
        facility_type: fac.type, facility_logo_url: fac.logo_url,
      };

      if (invite.status !== "pending") { setState({ kind: "used" }); return; }
      if (new Date(invite.expires_at) < new Date()) { setState({ kind: "expired" }); return; }

      // Already logged in with correct email — auto-accept
      if (!authLoading && session && user) {
        const emailMatch = user.email?.toLowerCase() === invite.email.toLowerCase();
        if (emailMatch) {
          setState({ kind: "accepting" });
          try {
            await acceptInvite(invite, user.id);
            setState({ kind: "done", facilityName: invite.facility_name });
            setTimeout(() => navigate(`/app/${invite.facility_slug}/dashboard`, { replace: true }), 1500);
          } catch (err) {
            setState({ kind: "setup", invite });
            toast.error(err instanceof Error ? err.message : "Failed to accept invitation.");
          }
          return;
        }
        setState({ kind: "wrong_email", invite });
        return;
      }

      setState({ kind: "setup", invite });
    }

    load();
    return () => { cancelled = true; };
  }, [token, session, user, authLoading, navigate]);

  // Auto-accept when user returns after email confirmation
  useEffect(() => {
    if (state.kind !== "confirm_email") return;
    const invite = state.invite;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (event === "SIGNED_IN" && sess?.user) {
        setState({ kind: "accepting" });
        try {
          if (sess.user.user_metadata?.full_name) {
            await supabase.from("profiles").update({ full_name: sess.user.user_metadata.full_name }).eq("id", sess.user.id);
          }
          await acceptInvite(invite, sess.user.id);
          setState({ kind: "done", facilityName: invite.facility_name });
          setTimeout(() => navigate(`/app/${invite.facility_slug}/dashboard`, { replace: true }), 1500);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to accept invitation.");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [state, navigate]);

  const isLoading = state.kind === "loading" || authLoading;

  return (
    <div className="grid min-h-screen lg:grid-cols-5">
      {/* Left brand panel */}
      <div
        className="relative hidden overflow-hidden lg:col-span-2 lg:flex lg:flex-col lg:justify-between"
        style={{ backgroundColor: "#0F766E" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F766E] via-[#0D6B63] to-[#0A5C55]" />
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="relative p-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <Hotel className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="text-base font-semibold text-white">StayFlow</span>
          </div>
        </div>
        <div className="relative space-y-5 px-10">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            You've been invited.
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            Set up your staff account and get access to your facility dashboard right away.
          </p>
        </div>
        <div className="relative p-10">
          <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} StayFlow</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 lg:col-span-3">
        <div className="w-full max-w-[460px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel className="h-[18px] w-[18px]" />
            </div>
            <span className="text-base font-semibold">StayFlow</span>
          </div>

          <Card className="rounded-2xl border-border/60 shadow-lg shadow-black/[0.04]">
            <CardContent className="p-8">

              {isLoading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading invitation…</p>
                </div>
              )}

              {state.kind === "not_found" && <ErrorState icon={XCircle} title="Invalid invitation" body="This invite link is invalid or has been copied incorrectly." />}
              {state.kind === "used" && <ErrorState icon={AlertTriangle} title="Already used" body="This invitation has already been accepted or was revoked." />}
              {state.kind === "expired" && <ErrorState icon={Clock} title="Invitation expired" body="This link has expired. Ask your facility administrator to resend it." />}

              {state.kind === "wrong_email" && (
                <div className="space-y-4">
                  <InviteHeader invite={state.invite} />
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div className="text-sm text-amber-900">
                        <p className="font-medium">Wrong account</p>
                        <p className="mt-0.5 text-amber-700">
                          This invite is for <span className="font-semibold">{state.invite.email}</span>.
                          You're signed in as <span className="font-semibold">{user?.email}</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2" onClick={signOut}>
                    <LogOut className="h-4 w-4" /> Sign out and use the right account
                  </Button>
                </div>
              )}

              {state.kind === "setup" && (
                <SetupForm
                  invite={state.invite}
                  onDone={(invite, facilityName, slug) => {
                    setState({ kind: "done", facilityName });
                    setTimeout(() => navigate(`/app/${slug}/dashboard`, { replace: true }), 1500);
                  }}
                  onEmailConfirmNeeded={(invite) => setState({ kind: "confirm_email", invite })}
                />
              )}

              {state.kind === "confirm_email" && (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Hotel className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Check your email</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We've sent a confirmation link to <span className="font-medium text-foreground">{state.invite.email}</span>.
                    Click it to activate your account — you'll be taken straight to <span className="font-medium">{state.invite.facility_name}</span>.
                  </p>
                </div>
              )}

              {state.kind === "accepting" && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium">Setting up your account…</p>
                </div>
              )}

              {state.kind === "done" && (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-semibold">Welcome to {state.facilityName}!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Taking you to your dashboard…</p>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Invite header — facility identity + role badge                    */
/* ------------------------------------------------------------------ */

function InviteHeader({ invite }: { invite: InviteData }) {
  const FacIcon = FACILITY_ICONS[invite.facility_type] ?? Hotel;
  return (
    <div className="mb-2 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        {invite.facility_logo_url ? (
          <img src={invite.facility_logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
        ) : (
          <FacIcon className="h-7 w-7 text-primary" />
        )}
      </div>
      <p className="text-sm text-muted-foreground">You've been invited to join</p>
      <h1 className="mt-0.5 text-lg font-bold">{invite.facility_name}</h1>
      <span className={`mt-2 inline-block rounded-md px-2.5 py-1 text-xs font-semibold ${ROLE_COLORS[invite.role]}`}>
        {ROLE_LABELS[invite.role]}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Setup form — name, phone, password                                */
/* ------------------------------------------------------------------ */

function SetupForm({ invite, onDone, onEmailConfirmNeeded }: {
  invite: InviteData;
  onDone: (invite: InviteData, facilityName: string, slug: string) => void;
  onEmailConfirmNeeded: (invite: InviteData) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { full_name: "", phone: "", password: "", confirm_password: "" },
  });

  const password = watch("password");

  async function onSubmit(values: SetupValues) {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: invite.email,
        password: values.password,
        options: {
          data: { full_name: values.full_name },
          // If email confirmation is on, send them back to this invite page
          emailRedirectTo: window.location.href,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          toast.error("An account with this email already exists. Ask your admin to resend the invite after you log in.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (!data.user) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      if (!data.session) {
        // Email confirmation required — wait for return
        onEmailConfirmNeeded(invite);
        return;
      }

      // Session available immediately — update profile and accept
      await supabase.from("profiles").update({
        full_name: values.full_name,
        ...(values.phone ? { phone: values.phone } : {}),
      }).eq("id", data.user.id);

      await acceptInvite(invite, data.user.id);
      onDone(invite, invite.facility_name, invite.facility_slug);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to set up account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <InviteHeader invite={invite} />

      <div className="my-5 border-t" />

      <div className="mb-5">
        <h2 className="text-base font-semibold">Set up your account</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          You'll use <span className="font-medium text-foreground">{invite.email}</span> to sign in.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full name */}
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name *</Label>
          <Input
            id="full_name"
            placeholder="Jane Doe"
            autoComplete="name"
            disabled={submitting}
            {...register("full_name")}
          />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+234 800 000 0000"
            autoComplete="tel"
            disabled={submitting}
            {...register("phone")}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Create password *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              disabled={submitting}
              className="pr-10"
              {...register("password")}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrengthBar password={password} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirm password *</Label>
          <div className="relative">
            <Input
              id="confirm_password"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              autoComplete="new-password"
              disabled={submitting}
              className="pr-10"
              {...register("confirm_password")}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirm_password && <p className="text-xs text-destructive">{errors.confirm_password.message}</p>}
        </div>

        <Button type="submit" className="w-full gap-2" size="lg" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Create account & join {invite.facility_name}
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Error state                                                        */
/* ------------------------------------------------------------------ */

function ErrorState({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <Icon className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
