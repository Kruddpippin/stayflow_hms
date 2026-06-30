import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthProvider";
import HeroDashboardAnimation from "@/features/auth/components/HeroDashboardAnimation";
import {
  Hotel, ArrowRight, CalendarDays, Users, BedDouble, CreditCard,
  BarChart3, Sparkles, Wrench, Globe, ShieldCheck, Zap, Smartphone, Download,
} from "lucide-react";

export default function LandingPage() {
  const { session, profile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !profileLoading && session) {
      if (profile?.platform_role === "admin") return;
      navigate("/onboarding", { replace: true });
    }
  }, [session, profile, loading, profileLoading, navigate]);

  return (
    <div className="min-h-[100dvh] bg-background">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-teal">
              <Hotel className="h-[18px] w-[18px]" />
            </div>
            <span className="font-display text-base font-bold tracking-tight">StayFlow</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
            <a href="#features" className="link-animate hover:text-foreground transition-colors">Features</a>
            <Link to="/pricing" className="link-animate hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2.5">
            <a
              href="/StayFlow.apk"
              download="StayFlow.apk"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
            >
              <Smartphone className="h-4 w-4" />
              Get the app
            </a>
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="btn-glow gap-1.5">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: "#0a4f4a" }}>
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F766E] via-[#0a5c55] to-[#083f3a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(52,211,153,0.12),transparent)]" />
        {/* Floating orbs */}
        <div className="absolute -right-24 -top-24 h-[480px] w-[480px] rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-[400px] w-[400px] rounded-full bg-teal-400/[0.06] blur-3xl" />
        {/* Grid texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

        <div className="relative mx-auto max-w-6xl px-5 py-28 lg:py-36">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* ── Left: text ── */}
            <div>
              {/* Badge */}
              <div className="mb-7 inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm stagger-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Built for Nigerian hospitality
              </div>

              <h1 className="font-display animate-fade-up text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-6xl stagger-2">
                Run your property<br />
                <span className="text-emerald-300">without the chaos.</span>
              </h1>

              <p className="mt-6 animate-fade-up text-lg leading-relaxed text-white/65 stagger-3">
                StayFlow is a complete hotel management system for hotels, apartments, guesthouses, and resorts.
                Reservations, rooms, housekeeping, billing — all in one dashboard.
              </p>

              <div className="mt-9 flex animate-fade-up flex-wrap items-center gap-4 stagger-4">
                <Link to="/signup">
                  <Button size="lg" className="btn-glow gap-2 bg-white text-[#0F766E] hover:bg-white/92 font-semibold shadow-xl">
                    Start free — no card needed <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
                    Sign in to your account
                  </Button>
                </Link>
              </div>
            </div>

            {/* ── Right: animated dashboard preview ── */}
            <div className="relative hidden lg:block animate-fade-in stagger-3">
              <div className="absolute inset-0 rounded-3xl bg-emerald-400/[0.08] blur-3xl scale-110 pointer-events-none" />
              {/* Remotion-rendered MP4 — pixel-perfect looping animation */}
              <video
                src="/hero-animation.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="relative w-full"
                style={{ mixBlendMode: "screen" }}
                onError={() => {/* CSS fallback is in HeroDashboardAnimation */}}
              />
            </div>
          </div>

          {/* Social proof strip */}
          <div className="mt-14 animate-fade-up flex flex-wrap gap-8 stagger-5">
            {[
              { value: "2,400+", label: "rooms managed" },
              { value: "₦47M+", label: "revenue processed" },
              { value: "98.3%", label: "uptime" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-bold text-white num-display">{s.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-24">
        <div className="mb-14 text-center">
          <p className="animate-fade-up text-xs font-semibold uppercase tracking-widest text-primary stagger-1">Everything you need</p>
          <h2 className="font-display animate-fade-up mt-3 text-4xl font-bold tracking-tight stagger-2">
            A full operation in one window
          </h2>
          <p className="animate-fade-up mt-4 text-muted-foreground max-w-md mx-auto stagger-3">
            From the moment a guest books to the moment they check out — and everything in between.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`card-lift animate-fade-up group relative overflow-hidden rounded-3xl border bg-card p-6 stagger-${Math.min(i + 1, 8)}`}
            >
              {/* Accent top bar */}
              <div className={`absolute inset-x-0 top-0 h-0.5 ${f.accent} transition-all duration-300 group-hover:h-1`} />

              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${f.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                <f.icon className={`h-5 w-5 ${f.iconColor}`} />
              </div>

              <h3 className="font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Value prop strip ── */}
      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Zap, title: "Set up in minutes", body: "Create your facility, add room types, invite staff. Most properties are live within an hour." },
              { icon: ShieldCheck, title: "Secure by default", body: "Role-based access means housekeeping sees tasks, accountants see invoices — nothing more." },
              { icon: Globe, title: "Works anywhere", body: "Browser, mobile web, or install it as an app. Your team can work from any device." },
            ].map((item, i) => (
              <div key={item.title} className={`animate-fade-up stagger-${i + 1}`}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-6xl px-5 py-24 text-center">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-12 shadow-teal-lg noise-overlay">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_120%,rgba(52,211,153,0.15),transparent)]" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Ready to run a tighter ship?
            </h2>
            <p className="mt-4 text-white/65 max-w-sm mx-auto">
              Free plan available. No credit card. Cancel whenever.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="btn-glow gap-2 bg-white text-primary hover:bg-white/92 font-semibold">
                  Create free account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            {/* Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Hotel className="h-3.5 w-3.5" />
                </div>
                <span className="font-display font-bold tracking-tight">StayFlow</span>
              </div>
              <p className="max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                The modern hotel management system built for Nigerian hospitality.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-10 text-sm text-muted-foreground">
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</p>
                <div className="flex flex-col gap-2">
                  <a href="#features" className="link-animate hover:text-foreground">Features</a>
                  <Link to="/pricing" className="link-animate hover:text-foreground">Pricing</Link>
                  <Link to="/login" className="link-animate hover:text-foreground">Sign in</Link>
                  <Link to="/signup" className="link-animate hover:text-foreground">Get started</Link>
                </div>
              </div>
            </div>

            {/* Download */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Mobile App</p>
              <p className="text-xs text-muted-foreground">
                Install StayFlow on Android for instant access from any device.
              </p>
              <a
                href="/StayFlow.apk"
                download="StayFlow.apk"
                className="inline-flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/10 hover:border-primary/50"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[10px] font-normal text-muted-foreground leading-none mb-0.5">Download for</p>
                  <p className="leading-none">Android <span className="font-normal text-muted-foreground text-xs">· 4.5 MB</span></p>
                </div>
                <Download className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>

          <div className="mt-8 border-t pt-6 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} StayFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Reservations",
    description: "Full reservation management — create, edit, check in and out, track sources, and manage room assignments.",
    accent: "bg-blue-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: BedDouble,
    title: "Room management",
    description: "Track room status in real time. Board view or table view. Bulk updates. Out-of-order tracking.",
    accent: "bg-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: Users,
    title: "Guest profiles",
    description: "Every guest builds a history — stay records, lifetime spend, tags like VIP or Corporate.",
    accent: "bg-violet-500",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    icon: CreditCard,
    title: "Invoices & payments",
    description: "Auto-generated folios, itemised invoices, payment recording, and online payment via Paystack.",
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    icon: Sparkles,
    title: "Housekeeping",
    description: "Kanban task board. Room cleaning tasks auto-created on checkout. Staff can update status from mobile.",
    accent: "bg-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: Wrench,
    title: "Maintenance",
    description: "Log work orders, set priority, assign staff. Resolved orders automatically return rooms to service.",
    accent: "bg-orange-500",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    icon: BarChart3,
    title: "Reports & analytics",
    description: "Occupancy trends, revenue charts, and exportable reports. Know where you stand at a glance.",
    accent: "bg-indigo-500",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    icon: Users,
    title: "Staff & roles",
    description: "Invite staff by email. Six permission tiers ensure each person only sees what they need.",
    accent: "bg-rose-500",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    icon: Globe,
    title: "Public booking",
    description: "A branded booking page at your unique URL. Guests book directly — no commission, no middleman.",
    accent: "bg-cyan-500",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
];
