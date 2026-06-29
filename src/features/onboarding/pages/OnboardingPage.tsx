import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Hotel, Plus, Loader2, AlertTriangle, LogOut,
  RotateCcw, ArrowRight, Mail,
} from "lucide-react";
import type { Facility, MembershipRole, FacilityType } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Types local to this page                                          */
/* ------------------------------------------------------------------ */

interface FacilityMembership {
  role: MembershipRole;
  facility: Pick<Facility, "id" | "name" | "slug" | "type" | "logo_url" | "status">;
}

interface PendingInvite {
  id: string;
  token: string;
  role: MembershipRole;
  facility: Pick<Facility, "name" | "type">;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const FACILITY_ICONS: Record<FacilityType, string> = {
  hotel: "🏨", motel: "🏩", apartment: "🏢", guesthouse: "🏠",
  hostel: "🛏️", resort: "🏖️", bnb: "☕", other: "🏗️",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-violet-100 text-violet-700",
  manager: "bg-blue-100 text-blue-700",
  front_desk: "bg-emerald-100 text-emerald-700",
  housekeeping: "bg-amber-100 text-amber-700",
  maintenance: "bg-orange-100 text-orange-700",
  accountant: "bg-cyan-100 text-cyan-700",
};

function roleBadge(role: string) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[role] ?? "bg-muted text-muted-foreground"}`}>
      {role.replace("_", " ")}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

type PageState = "loading" | "picker" | "zero-with-invites" | "error";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [state, setState] = useState<PageState>("loading");
  const [memberships, setMemberships] = useState<FacilityMembership[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);

  // Intended destination from a protected-route redirect
  const redirectParam = searchParams.get("redirect");
  const locationFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const intendedDest = redirectParam ?? locationFrom ?? null;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function resolve() {
      setState("loading");

      try {
        // 1 — Fetch memberships + joined facility data
        const { data: memRows, error: memErr } = await supabase
          .from("memberships")
          .select("role, facility:facilities(id, name, slug, type, logo_url, status)")
          .eq("user_id", user!.id)
          .eq("status", "active");

        if (memErr) throw memErr;
        if (cancelled) return;

        // Supabase returns the joined object directly for a belongs-to relation
        // but TS infers `unknown`, so we cast through `unknown` safely.
        const mems: FacilityMembership[] = (memRows ?? [])
          .filter((r) => r.facility !== null)
          .map((r) => ({
            role: r.role as MembershipRole,
            facility: r.facility as unknown as FacilityMembership["facility"],
          }));

        // 2 — Fetch pending invitations for this email
        const email = user!.email;
        let pendingInvites: PendingInvite[] = [];
        if (email) {
          const { data: invRows } = await supabase
            .from("invitations")
            .select("id, token, role, facility:facilities(name, type)")
            .eq("email", email.toLowerCase())
            .eq("status", "pending")
            .gt("expires_at", new Date().toISOString());

          if (!cancelled && invRows) {
            pendingInvites = invRows
              .filter((r) => r.facility !== null)
              .map((r) => ({
                id: r.id,
                token: r.token,
                role: r.role as MembershipRole,
                facility: r.facility as unknown as PendingInvite["facility"],
              }));
          }
        }

        if (cancelled) return;

        setMemberships(mems);
        setInvites(pendingInvites);

        // 3 — Branch on count
        if (mems.length === 0) {
          if (pendingInvites.length > 0) {
            setState("zero-with-invites");
          } else {
            navigate("/onboarding/create-facility", { replace: true });
          }
          return;
        }

        if (mems.length === 1) {
          const slug = mems[0].facility.slug;
          const dest = intendedDest && intendedDest.includes(slug)
            ? intendedDest
            : `/app/${slug}/dashboard`;
          navigate(dest, { replace: true });
          return;
        }

        // 2+ memberships — check intended destination
        if (intendedDest) {
          const matchedFacility = mems.find((m) =>
            intendedDest.includes(`/app/${m.facility.slug}`)
          );
          if (matchedFacility) {
            navigate(intendedDest, { replace: true });
            return;
          }
        }

        setState("picker");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [user, navigate, intendedDest]);

  /* ---- Loading ---- */
  if (state === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Hotel className="h-[18px] w-[18px]" />
          </div>
          <span className="text-base font-semibold">StayFlow</span>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  /* ---- Error ---- */
  if (state === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn't load your facilities. Check your connection and try again.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" /> Retry
          </Button>
          <Button variant="ghost" className="gap-2 text-destructive" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  /* ---- Zero memberships + pending invites ---- */
  if (state === "zero-with-invites") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex items-center justify-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel className="h-[18px] w-[18px]" />
            </div>
            <span className="text-base font-semibold">StayFlow</span>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">Welcome to StayFlow</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You have pending invitations, or you can create your own facility.
            </p>
          </div>


          {/* Invite cards */}
          <div className="space-y-3">
            {invites.map((inv) => (
              <InviteBannerCard key={inv.id} invite={inv} />
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Link to="/onboarding/create-facility">
            <Button variant="outline" className="w-full gap-2" size="lg">
              <Plus className="h-4 w-4" /> Create your own facility
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Facility picker (2+ memberships) ---- */
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Hotel className="h-[18px] w-[18px]" />
          </div>
          <span className="text-base font-semibold">StayFlow</span>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">Choose a facility</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the property you'd like to manage.
          </p>
        </div>

        {isAdmin && (
          <Link to="/admin" className="block">
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 transition-colors hover:bg-red-50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-900">Platform Admin Panel</p>
                <p className="text-xs text-red-700">Manage all facilities, users, and subscriptions</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-red-400" />
            </div>
          </Link>
        )}

        {/* Pending invitations banner */}
        {invites.length > 0 && (
          <div className="space-y-2">
            {invites.map((inv) => (
              <InviteBannerCard key={inv.id} invite={inv} compact />
            ))}
          </div>
        )}

        {/* Facility grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {memberships.map(({ role, facility }) => (
            <Card
              key={facility.id}
              className="group cursor-pointer rounded-2xl border-border/60 p-5 shadow-sm transition-shadow hover:shadow-md"
              onClick={() => navigate(`/app/${facility.slug}/dashboard`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/app/${facility.slug}/dashboard`); }}
              aria-label={`Open ${facility.name}`}
            >
              <div className="flex items-start gap-3">
                {facility.logo_url ? (
                  <img
                    src={facility.logo_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                    {FACILITY_ICONS[facility.type] ?? "🏗️"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold group-hover:text-primary">
                    {facility.name}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {facility.type}
                  </p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-3">
                {roleBadge(role)}
              </div>
            </Card>
          ))}

          {/* Create new facility card */}
          <Card
            className="group flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border/60 p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
            onClick={() => navigate("/onboarding/create-facility")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/onboarding/create-facility"); }}
            aria-label="Create new facility"
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Create new facility</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Invite banner card                                                */
/* ------------------------------------------------------------------ */

function InviteBannerCard({ invite, compact }: { invite: PendingInvite; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 ${compact ? "py-2.5" : "py-3.5"}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
        <Mail className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-amber-900">
          Invited to <span className="font-semibold">{invite.facility.name}</span>
        </p>
        <p className="text-xs text-amber-700">
          Join as {roleBadge(invite.role)}
        </p>
      </div>
      <Link to={`/invite/${invite.token}`}>
        <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700">
          Accept <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
