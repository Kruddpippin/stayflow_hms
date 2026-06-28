import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus, Hotel, Building2, LogIn, LogOut as LogOutIcon, Users,
  Banknote, BedDouble, Sparkles, Wrench, ArrowRight,
  AlertTriangle, TrendingUp, BarChart3,
} from "lucide-react";
import type { FacilityType, MembershipRole } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface FacilitySummary {
  facility_id: string;
  facility_name: string;
  facility_slug: string;
  facility_type: FacilityType;
  facility_status: string;
  facility_currency: string;
  facility_logo_url: string | null;
  membership_role: MembershipRole;
  total_rooms: number;
  occupied_rooms: number;
  dirty_rooms: number;
  oor_rooms: number;
  arrivals_today: number;
  departures_today: number;
  in_house: number;
  revenue_today: number;
  open_maintenance: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

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
const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  setup: { cls: "bg-amber-100 text-amber-700", label: "Setup" },
  active: { cls: "bg-emerald-100 text-emerald-700", label: "Active" },
  suspended: { cls: "bg-red-100 text-red-700", label: "Suspended" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function PortfolioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: facilities = [], isLoading, isError, refetch } = useQuery<FacilitySummary[]>({
    queryKey: ["portfolio", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portfolio_summary", { p_user_id: user!.id });
      if (error) throw error;
      return (data ?? []) as FacilitySummary[];
    },
  });

  // Redirect if no facilities
  if (!isLoading && !isError && facilities.length === 0) {
    navigate("/onboarding/create-facility", { replace: true });
    return null;
  }

  // Aggregated KPIs grouped by currency
  const aggregated = useMemo(() => {
    const byCurrency = new Map<string, { revenue: number; count: number }>();
    let totalRooms = 0, occupiedRooms = 0, arrivals = 0, departures = 0, inHouse = 0;

    for (const f of facilities) {
      totalRooms += f.total_rooms;
      occupiedRooms += f.occupied_rooms;
      arrivals += f.arrivals_today;
      departures += f.departures_today;
      inHouse += f.in_house;

      const entry = byCurrency.get(f.facility_currency) ?? { revenue: 0, count: 0 };
      entry.revenue += Number(f.revenue_today);
      entry.count++;
      byCurrency.set(f.facility_currency, entry);
    }

    const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return {
      totalFacilities: facilities.length,
      occupancy,
      totalRooms,
      occupiedRooms,
      arrivals,
      departures,
      inHouse,
      revenueByCurrency: [...byCurrency.entries()].map(([cur, v]) => ({ currency: cur, revenue: v.revenue, count: v.count })),
    };
  }, [facilities]);

  // Chart data
  const occupancyData = useMemo(() =>
    facilities.map((f) => ({
      name: f.facility_name.length > 12 ? f.facility_name.slice(0, 12) + "…" : f.facility_name,
      occupancy: f.total_rooms > 0 ? Math.round((f.occupied_rooms / f.total_rooms) * 100) : 0,
    })),
    [facilities]
  );

  const revenueData = useMemo(() =>
    facilities.map((f) => ({
      name: f.facility_name.length > 12 ? f.facility_name.slice(0, 12) + "…" : f.facility_name,
      revenue: Number(f.revenue_today),
      currency: f.facility_currency,
    })),
    [facilities]
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load portfolio data.</p>
        <Button variant="outline" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")} · {facilities.length} facilit{facilities.length !== 1 ? "ies" : "y"}</p>
        </div>
        <Link to="/onboarding/create-facility">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Create facility</Button>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard icon={Hotel} label="Facilities" value={String(aggregated.totalFacilities)} color="text-primary bg-primary/10" />
        <KpiCard icon={BedDouble} label="Occupancy" value={`${aggregated.occupancy}%`} sub={`${aggregated.occupiedRooms} / ${aggregated.totalRooms} rooms`} color="text-blue-600 bg-blue-100" />
        <KpiCard icon={LogIn} label="Arrivals today" value={String(aggregated.arrivals)} color="text-emerald-600 bg-emerald-100" />
        <KpiCard icon={LogOutIcon} label="Departures" value={String(aggregated.departures)} color="text-amber-600 bg-amber-100" />
        <KpiCard icon={Users} label="In-house" value={String(aggregated.inHouse)} color="text-violet-600 bg-violet-100" />
        <Card className="flex flex-col justify-center rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <Banknote className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground">Revenue today</span>
          </div>
          <div className="mt-2 space-y-0.5">
            {aggregated.revenueByCurrency.length === 0 ? (
              <p className="text-lg font-semibold">—</p>
            ) : (
              aggregated.revenueByCurrency.map((r) => (
                <p key={r.currency} className="text-base font-semibold">
                  {r.currency} {r.revenue.toLocaleString()}
                  {aggregated.revenueByCurrency.length > 1 && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">({r.count})</span>
                  )}
                </p>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Facilities grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Your facilities</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((f) => (
            <FacilityCard key={f.facility_id} facility={f} />
          ))}
          <Link to="/onboarding/create-facility"
            className="flex items-center justify-center rounded-2xl border-2 border-dashed p-8 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Create new facility</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Charts */}
      {facilities.length >= 2 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Occupancy comparison</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={occupancyData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214,20%,93%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(214,20%,90%)", fontSize: 13 }} formatter={(v) => [`${v}%`, "Occupancy"]} />
                <Bar dataKey="occupancy" fill="hsl(175,78%,26%)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Today's revenue by facility</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214,20%,93%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215,14%,46%)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(214,20%,90%)", fontSize: 13 }}
                  formatter={(v, _n, props) => {
                    const cur = (props.payload as { currency?: string })?.currency ?? "";
                    return [`${cur} ${Number(v).toLocaleString()}`, "Revenue"];
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(38,92%,50%)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {facilities.length === 1 && (
        <Card className="rounded-2xl p-5 text-center">
          <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Add another property to compare performance across facilities.</p>
          <Link to="/onboarding/create-facility"><Button variant="outline" className="mt-3 gap-2"><Plus className="h-4 w-4" /> Add facility</Button></Link>
        </Card>
      )}
    </div>
  );
}

/* ================================================================== */
/*  KPI card                                                          */
/* ================================================================== */

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <Card className="flex items-center gap-3 rounded-2xl p-4">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Facility card                                                     */
/* ================================================================== */

function FacilityCard({ facility: f }: { facility: FacilitySummary }) {
  const occ = f.total_rooms > 0 ? Math.round((f.occupied_rooms / f.total_rooms) * 100) : 0;
  const st = STATUS_BADGE[f.facility_status] ?? STATUS_BADGE.active;
  const alerts = f.dirty_rooms + f.oor_rooms + f.open_maintenance;

  return (
    <Link to={`/app/${f.facility_slug}/dashboard`}>
      <Card className="group cursor-pointer rounded-2xl p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {f.facility_logo_url ? (
              <img src={f.facility_logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">
                {FAC_ICONS[f.facility_type] ?? "🏗️"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold group-hover:text-primary">{f.facility_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", ROLE_COLORS[f.membership_role])}>
                  {ROLE_LABELS[f.membership_role]}
                </span>
                <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", st.cls)}>{st.label}</span>
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground">Occupancy</p>
            <p className="text-base font-semibold">{occ}%</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground">In / Out</p>
            <p className="text-base font-semibold">{f.arrivals_today} / {f.departures_today}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground">Revenue</p>
            <p className="text-base font-semibold">{f.facility_currency} {Number(f.revenue_today).toLocaleString()}</p>
          </div>
        </div>

        {alerts > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {f.dirty_rooms > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-amber-700">
                <Sparkles className="h-3 w-3" /> {f.dirty_rooms} dirty
              </span>
            )}
            {f.open_maintenance > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-1.5 py-0.5 text-orange-700">
                <Wrench className="h-3 w-3" /> {f.open_maintenance} maint.
              </span>
            )}
            {f.oor_rooms > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-red-700">
                {f.oor_rooms} out of order
              </span>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}
