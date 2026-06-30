import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useFacility } from "@/components/providers/FacilityProvider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus, BedDouble, LogIn, LogOut as LogOutIcon, Users, Banknote, Sparkles,
  TrendingUp, Check, Circle, ArrowRight, CalendarPlus, X, Loader2,
  BarChart3, AlertTriangle,
} from "lucide-react";
import {
  useRoomCounts, useTodayReservations, useTodayRevenue,
  useSetupCounts, useOccupancyTrend, useQuickCheckIn, useQuickCheckOut,
} from "../hooks/useDashboardData";
import type { MembershipRole } from "@/types/db";

const CAN_CREATE_RESERVATION: MembershipRole[] = ["owner", "manager", "front_desk"];

/* ================================================================== */
/*  Skeleton helpers                                                  */
/* ================================================================== */

function CardSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl border bg-card p-5", className)}><div className="h-16 rounded-lg bg-muted" /></div>;
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
      <span className="flex-1 text-destructive">{message}</span>
      <Button size="sm" variant="ghost" onClick={onRetry}>Retry</Button>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                              */
/* ================================================================== */

export default function DashboardPage() {
  const { facility, role } = useFacility();
  const [searchParams] = useSearchParams();
  const slug = facility?.slug ?? "";
  const isWelcome = searchParams.get("welcome") === "1";
  const canReserve = role ? CAN_CREATE_RESERVATION.includes(role) : false;
  const isLimitedRole = role === "housekeeping" || role === "maintenance";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{facility?.name ?? "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        {canReserve && (
          <Link to={`/app/${slug}/reservations/new`}>
            <Button className="btn-glow gap-2"><Plus className="h-4 w-4" /> New reservation</Button>
          </Link>
        )}
      </div>

      {/* Setup checklist */}
      {facility && (isWelcome || facility.status === "setup") && (
        <SetupChecklist facilityId={facility.id} facilityName={facility.name} slug={slug} />
      )}

      {/* KPI cards */}
      <KpiCards slug={slug} isLimitedRole={isLimitedRole} />

      {/* Today panel + chart */}
      {!isLimitedRole && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2"><TodayPanel slug={slug} /></div>
          <div><OccupancyChart /></div>
        </div>
      )}

      {/* Room status strip */}
      <RoomStatusStrip slug={slug} />
    </div>
  );
}

/* ================================================================== */
/*  Setup checklist                                                   */
/* ================================================================== */

function SetupChecklist({ facilityId, facilityName, slug }: { facilityId: string; facilityName: string; slug: string }) {
  const { data, isLoading, isError, refetch } = useSetupCounts();
  const storageKey = `stayflow-setup-dismissed-${facilityId}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === "1");

  const steps = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Facility created", done: true, href: "" },
      { label: "Add room types", done: data.roomTypes > 0, href: `/app/${slug}/room-types` },
      { label: "Add rooms", done: data.rooms > 0, href: `/app/${slug}/rooms` },
      { label: "Set rate plans", done: data.ratePlans > 0, href: `/app/${slug}/room-types` },
      { label: "Invite staff", done: data.members > 1, href: `/app/${slug}/staff` },
      { label: "Take your first booking", done: data.reservations > 0, href: `/app/${slug}/reservations/new` },
    ];
  }, [data, slug]);

  const completed = steps.filter((s) => s.done).length;
  const allDone = steps.length > 0 && completed === steps.length;

  useEffect(() => {
    if (allDone) {
      supabase.from("facilities").update({ status: "active" }).eq("id", facilityId).then();
    }
  }, [allDone, facilityId]);

  if (dismissed) return null;
  if (isLoading) return <CardSkeleton />;
  if (isError) return <SectionError message="Couldn't load setup progress." onRetry={refetch} />;

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  }

  return (
    <Card className="relative rounded-2xl border-primary/20 bg-primary/[0.03] p-6">
      <button onClick={dismiss} className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>

      <h2 className="text-base font-semibold">Finish setting up {facilityName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{completed} of {steps.length} done</p>

      <div className="mt-3 mb-5 h-1.5 rounded-full bg-border">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>

      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {s.done
                ? <Check className="h-4 w-4 text-emerald-600" />
                : <Circle className="h-4 w-4 text-muted-foreground/40" />}
              <span className={cn("text-sm", s.done ? "text-muted-foreground line-through" : "font-medium")}>{s.label}</span>
            </div>
            {!s.done && s.href && (
              <Link to={s.href}><Button size="sm" variant="ghost" className="gap-1 text-xs"><ArrowRight className="h-3.5 w-3.5" /></Button></Link>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  KPI Cards                                                         */
/* ================================================================== */

function KpiCards({ slug, isLimitedRole }: { slug: string; isLimitedRole: boolean }) {
  const rooms = useRoomCounts();
  const reservations = useTodayReservations();
  const revenue = useTodayRevenue();

  const occupancy = rooms.data
    ? rooms.data.total > 0 ? Math.round((rooms.data.occupied / rooms.data.total) * 100) : 0
    : null;

  const cards: { label: string; value: string; icon: React.ElementType; color: string; href?: string; show: boolean }[] = [
    { label: "Occupancy today", value: occupancy !== null ? `${occupancy}%` : "—", icon: BedDouble, color: "text-blue-600 bg-blue-100", show: true },
    { label: "Arrivals today", value: String(reservations.data?.arrivals.length ?? "—"), icon: LogIn, color: "text-emerald-600 bg-emerald-100", show: !isLimitedRole },
    { label: "Departures today", value: String(reservations.data?.departures.length ?? "—"), icon: LogOutIcon, color: "text-amber-600 bg-amber-100", show: !isLimitedRole },
    { label: "In-house guests", value: String(reservations.data?.inHouse.length ?? "—"), icon: Users, color: "text-violet-600 bg-violet-100", show: !isLimitedRole },
    { label: "Today's revenue", value: revenue.data !== undefined ? `₦${Number(revenue.data).toLocaleString()}` : "—", icon: Banknote, color: "text-emerald-600 bg-emerald-100", show: !isLimitedRole },
    { label: "Rooms to clean", value: String(rooms.data?.dirty ?? "—"), icon: Sparkles, color: "text-orange-600 bg-orange-100", href: `/app/${slug}/housekeeping`, show: true },
  ];

  const visibleCards = cards.filter((c) => c.show);
  const isLoading = rooms.isLoading || reservations.isLoading || revenue.isLoading;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {visibleCards.map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {visibleCards.map((c, i) => {
        const Inner = (
          <Card
            key={c.label}
            className={cn(
              "animate-fade-up card-lift group relative overflow-hidden rounded-2xl border-0 p-5 shadow-card",
              `stagger-${i + 1}`
            )}
          >
            {/* Subtle accent line top */}
            <div className={cn("absolute inset-x-0 top-0 h-[2px] opacity-60 transition-all duration-300 group-hover:opacity-100", c.color.split(" ")[1]?.replace("bg-", "bg-"))} />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
                <p className="stat-value mt-2 text-2xl">{c.value}</p>
              </div>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110", c.color)}>
                <c.icon className="h-4 w-4" />
              </div>
            </div>
          </Card>
        );
        return c.href
          ? <Link key={c.label} to={c.href} className="block">{Inner}</Link>
          : <div key={c.label}>{Inner}</div>;
      })}
    </div>
  );
}

/* ================================================================== */
/*  Today panel                                                       */
/* ================================================================== */

function TodayPanel({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useTodayReservations();
  const checkIn = useQuickCheckIn();
  const checkOut = useQuickCheckOut();
  const [tab, setTab] = useState<"arrivals" | "departures">("arrivals");

  if (isLoading) return <CardSkeleton className="min-h-[280px]" />;
  if (isError) return <SectionError message="Couldn't load today's reservations." onRetry={refetch} />;

  const list = tab === "arrivals" ? (data?.arrivals ?? []) : (data?.departures ?? []);

  return (
    <Card className="rounded-2xl p-0">
      {/* Tabs */}
      <div className="flex border-b">
        {(["arrivals", "departures"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors",
              tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t} ({t === "arrivals" ? data?.arrivals.length : data?.departures.length})
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y">
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <CalendarPlus className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {tab === "arrivals" ? "No arrivals expected today." : "No departures expected today."}
            </p>
            <Link to={`/app/${slug}/reservations/new`}>
              <Button variant="outline" size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Create reservation</Button>
            </Link>
          </div>
        ) : (
          list.map((r) => {
            const guest = (r.guest as unknown as { full_name: string } | null)?.full_name ?? "Guest";
            const roomType = (r.room_type as unknown as { name: string } | null)?.name ?? "";
            const roomName = (r.room as unknown as { name: string } | null)?.name;
            const isCheckedIn = r.status === "checked_in";

            return (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{guest}</p>
                  <p className="text-xs text-muted-foreground">
                    {roomType}{roomName ? ` · Room ${roomName}` : ""} · {r.adults + r.children} guests
                  </p>
                </div>
                {tab === "arrivals" && !isCheckedIn && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={checkIn.isPending}
                    onClick={() => checkIn.mutate({ reservationId: r.id, roomId: r.room_id })}
                  >
                    {checkIn.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                    Check in
                  </Button>
                )}
                {tab === "departures" && isCheckedIn && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={checkOut.isPending}
                    onClick={() => checkOut.mutate({ reservationId: r.id, roomId: r.room_id })}
                  >
                    {checkOut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOutIcon className="h-3.5 w-3.5" />}
                    Check out
                  </Button>
                )}
                {isCheckedIn && tab === "arrivals" && (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">In-house</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

/* ================================================================== */
/*  Room status strip                                                 */
/* ================================================================== */

function RoomStatusStrip({ slug }: { slug: string }) {
  const { data, isLoading } = useRoomCounts();

  if (isLoading) return <CardSkeleton />;
  if (!data || data.total === 0) return null;

  const segments: { label: string; count: number; color: string; bgColor: string }[] = [
    { label: "Available", count: data.available, color: "bg-emerald-500", bgColor: "bg-emerald-100 text-emerald-700" },
    { label: "Occupied",  count: data.occupied,  color: "bg-blue-500",    bgColor: "bg-blue-100 text-blue-700" },
    { label: "Dirty",     count: data.dirty,     color: "bg-amber-500",   bgColor: "bg-amber-100 text-amber-700" },
    { label: "Clean",     count: data.clean,     color: "bg-teal-500",    bgColor: "bg-teal-100 text-teal-700" },
    { label: "Out of order", count: data.out_of_order, color: "bg-red-500", bgColor: "bg-red-100 text-red-700" },
  ];

  return (
    <Link to={`/app/${slug}/rooms`}>
      <Card className="rounded-2xl p-5 transition-shadow hover:shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Room status</h3>
          <span className="text-xs text-muted-foreground">{data.total} rooms total</span>
        </div>

        {/* Bar */}
        <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
          {segments.map((s) =>
            s.count > 0 ? (
              <div
                key={s.label}
                className={cn("transition-all", s.color)}
                style={{ width: `${(s.count / data.total) * 100}%` }}
              />
            ) : null
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className={cn("inline-flex min-w-[20px] items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-semibold", s.bgColor)}>
                {s.count}
              </span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </Link>
  );
}

/* ================================================================== */
/*  Occupancy chart                                                   */
/* ================================================================== */

function OccupancyChart() {
  const { data, isLoading, isError, refetch } = useOccupancyTrend();

  if (isLoading) return <CardSkeleton className="min-h-[280px]" />;
  if (isError) return <SectionError message="Couldn't load occupancy trend." onRetry={refetch} />;

  const hasData = data && data.length > 0 && data.some((d) => d.occupancy > 0);

  return (
    <Card className="rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">7-day occupancy</h3>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">Not enough data to show a trend yet.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="occ-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(175, 78%, 26%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(175, 78%, 26%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214, 20%, 93%)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(215, 14%, 46%)" }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215, 14%, 46%)" }} tickLine={false} axisLine={false} unit="%" />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid hsl(214, 20%, 90%)", fontSize: 13 }}
              formatter={(v) => [`${v}%`, "Occupancy"]}
            />
            <Area
              type="monotone"
              dataKey="occupancy"
              stroke="hsl(175, 78%, 26%)"
              strokeWidth={2}
              fill="url(#occ-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
