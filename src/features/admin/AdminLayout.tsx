import { useState, useCallback } from "react";
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, LayoutDashboard, Building2, Users, Menu, X,
  LogOut, User, ArrowLeft, CreditCard, Tag,
} from "lucide-react";

const NAV = [
  { path: "dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { path: "facilities",    label: "Facilities",     icon: Building2 },
  { path: "users",         label: "Users",          icon: Users },
  { path: "subscriptions", label: "Subscriptions",  icon: CreditCard },
  { path: "plans",         label: "Plans & Pricing", icon: Tag },
];

export default function AdminLayout() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/login", { replace: true });
  }, [signOut, navigate]);

  const initials = (profile?.full_name ?? user?.email ?? "A")
    .split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <div className="flex min-h-screen bg-muted/30">
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:translate-x-0",
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">StayFlow Admin</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {NAV.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={`/admin/${path}`}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                    isActive ? "bg-red-50 text-red-700" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="my-3 border-t" />

          <Link
            to="/onboarding"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to app
          </Link>
        </nav>

        <div className="shrink-0 border-t p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{profile?.full_name ?? "Admin"}</p>
              <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                Platform Admin
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <button onClick={() => setDrawerOpen(true)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold lg:hidden">StayFlow Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/account">
              <Button variant="ghost" size="sm" className="gap-2">
                <User className="h-4 w-4" /> Account
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
