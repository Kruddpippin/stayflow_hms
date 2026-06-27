import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Hotel, Loader2, AlertTriangle, CheckCircle2, LogOut, ArrowRight,
  UserPlus, LogIn, Clock, XCircle, ShieldAlert,
  Building2, Home, Coffee, Warehouse, TreePalm, BedDouble, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import type { FacilityType, MembershipRole } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const FACILITY_ICONS: Record<FacilityType, React.ElementType> = {
  hotel: Hotel, motel: Building2, apartment: Warehouse, guesthouse: Home,
  hostel: BedDouble, resort: TreePalm, bnb: Coffee, other: LayoutGrid,
};

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Owner", manager: "Manager", front_desk: "Front Desk",
  housekeeping: "Housekeeping", maintenance: "Maintenance", accountant: "Accountant",
};

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
  | { kind: "valid"; invite: InviteData }
  | { kind: "accepting" }
  | { kind: "accepted"; slug: string };

/* ------------------------------------------------------------------ */
/*  Component                                                         */
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

      if (error || !data) {
        setState({ kind: "not_found" });
        return;
      }

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

      setState({ kind: "valid", invite });
    }

    load();
    return () => { cancelled = true; };
  }, [token]);

  /* ---- Accept handler ---- */
  async function handleAccept(invite: InviteData) {
    if (!user) return;
    setState({ kind: "accepting" });

    try {
      // Check for existing membership
      const { data: existing } = await supabase
        .from("memberships")
        .select("id")
        .eq("facility_id", invite.facility_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!existing) {
        const { error: memErr } = await supabase
          .from("memberships")
          .insert({
            facility_id: invite.facility_id,
            user_id: user.id,
            role: invite.role,
            status: "active",
          });
        if (memErr) throw memErr;
      }

      // Mark invitation as accepted
      const { error: invErr } = await supabase
        .from("invitations")
        .update({ status: "accepted" })
        .eq("id", invite.id);
      if (invErr) throw invErr;

      setState({ kind: "accepted", slug: invite.facility_slug });

      setTimeout(() => {
        navigate(`/app/${invite.facility_slug}/dashboard`, { replace: true });
      }, 1500);
    } catch (err: unknown) {
      setState({ kind: "valid", invite });
      const msg = err instanceof Error ? err.message : "Failed to accept invitation.";
      toast.error(msg);
    }
  }

  /* ---- Render ---- */
  const isLoggedIn = !authLoading && !!session;

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
            You're invited.
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            Someone on a StayFlow team has invited you to join their facility.
          </p>
        </div>

        <div className="relative p-10">
          <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} StayFlow</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 lg:col-span-3">
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel className="h-[18px] w-[18px]" />
            </div>
            <span className="text-base font-semibold">StayFlow</span>
          </div>

          <Card className="rounded-2xl border-border/60 shadow-lg shadow-black/[0.04]">
            <CardContent className="p-8">
              {/* Loading */}
              {(state.kind === "loading" || authLoading) && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading invitation…</p>
                </div>
              )}

              {/* Not found */}
              {state.kind === "not_found" && (
                <ErrorCard
                  icon={XCircle}
                  title="Invalid invitation"
                  description="This invitation link is invalid. It may have been copied incorrectly."
                  action={<Link to="/login"><Button className="gap-2">Go to login <ArrowRight className="h-4 w-4" /></Button></Link>}
                />
              )}

              {/* Already used / revoked */}
              {state.kind === "used" && (
                <ErrorCard
                  icon={AlertTriangle}
                  title="Invitation already used"
                  description="This invitation has already been accepted or was revoked by the facility."
                  action={<Link to="/login"><Button variant="outline" className="gap-2">Go to login <ArrowRight className="h-4 w-4" /></Button></Link>}
                />
              )}

              {/* Expired */}
              {state.kind === "expired" && (
                <ErrorCard
                  icon={Clock}
                  title="Invitation expired"
                  description="This invitation has expired. Ask the facility administrator to send a new one."
                  action={<Link to="/login"><Button variant="outline" className="gap-2">Go to login <ArrowRight className="h-4 w-4" /></Button></Link>}
                />
              )}

              {/* Valid invitation */}
              {state.kind === "valid" && (
                <ValidInvite
                  invite={state.invite}
                  isLoggedIn={isLoggedIn}
                  currentEmail={user?.email ?? null}
                  onAccept={() => handleAccept(state.invite)}
                  onSignOut={signOut}
                />
              )}

              {/* Accepting */}
              {state.kind === "accepting" && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium">Joining facility…</p>
                </div>
              )}

              {/* Accepted */}
              {state.kind === "accepted" && (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">You're in!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Taking you to the dashboard…
                  </p>
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
/*  Error card                                                        */
/* ------------------------------------------------------------------ */

function ErrorCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <Icon className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Valid invite view                                                  */
/* ------------------------------------------------------------------ */

function ValidInvite({
  invite,
  isLoggedIn,
  currentEmail,
  onAccept,
  onSignOut,
}: {
  invite: InviteData;
  isLoggedIn: boolean;
  currentEmail: string | null;
  onAccept: () => void;
  onSignOut: () => void;
}) {
  const FacIcon = FACILITY_ICONS[invite.facility_type] ?? Hotel;
  const emailMatch = currentEmail?.toLowerCase() === invite.email.toLowerCase();

  return (
    <div>
      {/* Facility identity */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          {invite.facility_logo_url ? (
            <img src={invite.facility_logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <FacIcon className="h-7 w-7 text-primary" />
          )}
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          You've been invited to join
        </h1>
        <p className="mt-1 text-lg font-bold text-primary">{invite.facility_name}</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">Role:</span>
          <span className="font-semibold">{ROLE_LABELS[invite.role] ?? invite.role}</span>
        </div>
      </div>

      {/* Case A — not logged in */}
      {!isLoggedIn && (
        <div>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Sign up or log in as <span className="font-medium text-foreground">{invite.email}</span> to accept.
          </p>
          <div className="space-y-3">
            <Link
              to={`/signup?email=${encodeURIComponent(invite.email)}&redirect=${encodeURIComponent(`/invite/${invite.token}`)}`}
            >
              <Button className="w-full gap-2" size="lg">
                <UserPlus className="h-4 w-4" /> Create account
              </Button>
            </Link>
            <Link
              to={`/login?email=${encodeURIComponent(invite.email)}&redirect=${encodeURIComponent(`/invite/${invite.token}`)}`}
            >
              <Button variant="outline" className="w-full gap-2" size="lg">
                <LogIn className="h-4 w-4" /> Log in
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Case B — logged in, email mismatch */}
      {isLoggedIn && !emailMatch && (
        <div>
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-900">
                <p className="font-medium">Email mismatch</p>
                <p className="mt-1 text-amber-700">
                  This invite was sent to <span className="font-semibold">{invite.email}</span>, but you're signed in as <span className="font-semibold">{currentEmail}</span>.
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={onSignOut}>
            <LogOut className="h-4 w-4" /> Sign out and use the right account
          </Button>
        </div>
      )}

      {/* Case B — logged in, email matches */}
      {isLoggedIn && emailMatch && (
        <Button className="w-full gap-2" size="lg" onClick={onAccept}>
          <CheckCircle2 className="h-4 w-4" /> Accept invitation
        </Button>
      )}
    </div>
  );
}
