import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, NavLink, Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useFacility } from "@/components/providers/FacilityProvider";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Hotel, LayoutDashboard, CalendarDays, Monitor, BedDouble, Grid3X3,
  Users, Sparkles, Wrench, FileText, CreditCard, BarChart3,
  UserCog, Settings, Menu, X, Search, ChevronDown, Globe, MessageSquare, Shield,
  LogOut, User, Plus, ShieldAlert, Loader2, Check,
} from "lucide-react";
import type { MembershipRole, FacilityType } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Nav config — role-aware, data-driven                              */
/* ------------------------------------------------------------------ */

const ALL_ROLES: MembershipRole[] = ["owner", "manager", "front_desk", "housekeeping", "maintenance", "accountant"];

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: MembershipRole[];
}

const NAV_ITEMS: NavItem[] = [
  { path: "dashboard",    label: "Dashboard",     icon: LayoutDashboard, roles: ALL_ROLES },
  { path: "reservations", label: "Reservations",  icon: CalendarDays,    roles: ["owner", "manager", "front_desk"] },
  { path: "front-desk",   label: "Front Desk",    icon: Monitor,         roles: ["owner", "manager", "front_desk"] },
  { path: "rooms",        label: "Rooms",         icon: BedDouble,       roles: ["owner", "manager", "front_desk"] },
  { path: "room-types",   label: "Room Types",    icon: Grid3X3,         roles: ["owner", "manager"] },
  { path: "guests",       label: "Guests",        icon: Users,           roles: ["owner", "manager", "front_desk"] },
  { path: "housekeeping", label: "Housekeeping",  icon: Sparkles,        roles: ["owner", "manager", "front_desk", "housekeeping"] },
  { path: "maintenance",  label: "Maintenance",   icon: Wrench,          roles: ["owner", "manager", "front_desk", "maintenance"] },
  { path: "invoices",     label: "Invoices",      icon: FileText,        roles: ["owner", "manager", "front_desk", "accountant"] },
  { path: "payments",     label: "Payments",      icon: CreditCard,      roles: ["owner", "manager", "front_desk", "accountant"] },
  { path: "reports",      label: "Reports",       icon: BarChart3,       roles: ["owner", "manager", "accountant"] },
  { path: "messages",     label: "Messages",      icon: MessageSquare,   roles: ["owner", "manager", "front_desk"] },
  { path: "channels",     label: "Channels",      icon: Globe,           roles: ["owner", "manager"] },
  { path: "audit",        label: "Audit Log",     icon: Shield,          roles: ["owner", "manager"] },
  { path: "staff",        label: "Staff",         icon: UserCog,         roles: ["owner", "manager"] },
  { path: "settings",     label: "Settings",      icon: Settings,        roles: ["owner", "manager"] },
];

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

const FAC_ICONS: Record<FacilityType, string> = {
  hotel: "🏨", motel: "🏩", apartment: "🏢", guesthouse: "🏠",
  hostel: "🛏️", resort: "🏖️", bnb: "☕", other: "🏗️",
};

/* ------------------------------------------------------------------ */
/*  Dropdown hook — click-outside + Escape                            */
/* ------------------------------------------------------------------ */

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}

/* ------------------------------------------------------------------ */
/*  User facility list (for switcher)                                 */
/* ------------------------------------------------------------------ */

interface UserFacility {
  facility_id: string;
  role: MembershipRole;
  name: string;
  slug: string;
  type: FacilityType;
  logo_url: string | null;
}

function useUserFacilities() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<UserFacility[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    supabase
      .from("memberships")
      .select("facility_id, role, facility:facilities(name, slug, type, logo_url)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(({ data }) => {
        if (cancelled || !data) return;
        setFacilities(
          data
            .filter((r) => r.facility)
            .map((r) => {
              const f = r.facility as unknown as { name: string; slug: string; type: FacilityType; logo_url: string | null };
              return { facility_id: r.facility_id, role: r.role as MembershipRole, ...f };
            })
        );
      });

    return () => { cancelled = true; };
  }, [user]);

  return facilities;
}

/* ------------------------------------------------------------------ */
/*  Main layout                                                       */
/* ------------------------------------------------------------------ */

export function AppLayout() {
  const { facilitySlug } = useParams();
  const navigate = useNavigate();
  const { facility, role, loading } = useFacility();
  const { user, profile, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleNav = role ? NAV_ITEMS.filter((item) => item.roles.includes(role)) : [];

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/login", { replace: true });
  }, [signOut, navigate]);

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 animate-pulse border-r bg-card lg:block">
          <div className="h-14 border-b" />
          <div className="space-y-2 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted" />
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="h-14 border-b bg-card" />
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- 403 ---- */
  if (!facility || !role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">You don't have access to this facility</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This facility doesn't exist or you haven't been granted membership.
        </p>
        <Link to="/onboarding">
          <Button className="gap-2">Go to your workspace <ChevronDown className="h-4 w-4 -rotate-90" /></Button>
        </Link>
      </div>
    );
  }

  /* ---- Suspended ---- */
  if (facility.status === "suspended") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">{facility.name} is suspended</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {role === "owner"
            ? "Access to this facility has been suspended. This is usually due to a billing issue — check your subscription or contact support."
            : "Access to this facility has been suspended by the owner or StayFlow support. Contact your facility owner for details."}
        </p>
        <div className="flex gap-3">
          {role === "owner" && (
            <Link to="/account/billing">
              <Button className="gap-2">View billing</Button>
            </Link>
          )}
          <Link to="/onboarding">
            <Button variant="outline" className="gap-2">Go to your workspace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const initials = (profile?.full_name ?? user?.email ?? "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* ---- Mobile drawer backdrop ---- */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      {/* ---- Sidebar ---- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:translate-x-0",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {facility.logo_url ? (
              <img src={facility.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-xl object-cover shadow-sm" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-teal">
                <Hotel className="h-4 w-4" />
              </div>
            )}
            <span className="font-display truncate text-sm font-bold tracking-tight">{facility.name}</span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2" aria-label="Facility navigation">
          <ul className="space-y-0.5">
            {visibleNav.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={`/app/${facilitySlug}/${path}`}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "nav-link-slide flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(175_78%_26%_/_0.15)]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-150", isActive && "scale-110")} />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          {role === "owner" && (
            <>
              <div className="my-2 border-t" />
              <ul className="space-y-0.5">
                <li>
                  <NavLink
                    to="/account/billing"
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "nav-link-slide flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(175_78%_26%_/_0.15)]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )
                    }
                  >
                    <CreditCard className="h-4 w-4 shrink-0" />
                    Billing &amp; Plans
                  </NavLink>
                </li>
              </ul>
            </>
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="shrink-0 border-t p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{profile?.full_name ?? "User"}</p>
              <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", ROLE_COLORS[role])}>
                {ROLE_LABELS[role]}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ---- Main column ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 lg:px-6">
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Facility logo + name (mobile) */}
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            {facility.logo_url ? (
              <img src={facility.logo_url} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Hotel className="h-3.5 w-3.5" />
              </div>
            )}
            <span className="truncate text-sm font-semibold">{facility.name}</span>
          </div>

          {/* Facility logo (desktop, next to search) */}
          <div className="hidden items-center gap-2 lg:flex">
            {facility.logo_url ? (
              <img src={facility.logo_url} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Hotel className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          {/* Search */}
          <div className="hidden flex-1 lg:block lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search reservations, guests, rooms…"
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Facility switcher */}
            <FacilitySwitcher
              currentSlug={facilitySlug!}
              currentFacilityId={facility.id}
            />

            {/* Notifications */}
            <NotificationsBell />

            {/* User menu */}
            <UserMenu
              initials={initials}
              name={profile?.full_name ?? "User"}
              email={user?.email ?? ""}
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Facility Switcher                                                 */
/* ================================================================== */

function FacilitySwitcher({ currentSlug, currentFacilityId }: { currentSlug: string; currentFacilityId: string }) {
  const { open, setOpen, ref } = useDropdown();
  const navigate = useNavigate();
  const facilities = useUserFacilities();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Switch facility"
        aria-expanded={open}
      >
        <Hotel className="h-4 w-4" />
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border bg-card p-1.5 shadow-lg" role="menu">
          <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your facilities
          </p>

          {facilities.map((f) => (
            <button
              key={f.facility_id}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (f.slug !== currentSlug) navigate(`/app/${f.slug}/dashboard`);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                f.facility_id === currentFacilityId
                  ? "bg-primary/5"
                  : "hover:bg-accent"
              )}
            >
              {f.logo_url ? (
                <img src={f.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
                  {FAC_ICONS[f.type] ?? "🏗️"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", ROLE_COLORS[f.role])}>
                  {ROLE_LABELS[f.role]}
                </span>
              </div>
              {f.facility_id === currentFacilityId && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}

          <div className="my-1 border-t" />

          <button
            role="menuitem"
            onClick={() => { setOpen(false); navigate("/onboarding/create-facility"); }}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed">
              <Plus className="h-4 w-4" />
            </div>
            Create new facility
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  User Avatar Menu                                                  */
/* ================================================================== */

function UserMenu({
  initials,
  name,
  email,
  onSignOut,
}: {
  initials: string;
  name: string;
  email: string;
  onSignOut: () => void;
}) {
  const { open, setOpen, ref } = useDropdown();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        aria-label="User menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border bg-card p-1.5 shadow-lg" role="menu">
          <div className="px-2.5 py-2">
            <p className="text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>

          <div className="my-1 border-t" />

          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <User className="h-4 w-4" /> Account
          </Link>

          <Link
            to="/account/billing"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <CreditCard className="h-4 w-4" /> Billing &amp; Plans
          </Link>

          <button
            role="menuitem"
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
