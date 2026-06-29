import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAdminStats } from "../hooks/useAdminData";
import {
  Users, Building2, CalendarDays, DollarSign, CheckCircle2, AlertTriangle, Settings2, Loader2,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Organizations", value: stats.totalOrgs, icon: Building2, color: "text-violet-600 bg-violet-50" },
    { label: "Total Facilities", value: stats.totalFacilities, icon: Building2, color: "text-teal-600 bg-teal-50" },
    { label: "Total Reservations", value: stats.totalReservations, icon: CalendarDays, color: "text-amber-600 bg-amber-50" },
    { label: "Active Facilities", value: stats.activeFacilities, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
    { label: "Suspended", value: stats.suspendedFacilities, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { label: "In Setup", value: stats.setupFacilities, icon: Settings2, color: "text-gray-600 bg-gray-50" },
    { label: "Platform Revenue", value: `₦${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-muted-foreground">
          Monitor all facilities, users, and activity across the StayFlow platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="flex items-center gap-4 rounded-2xl p-5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold">{c.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/facilities">
          <Card className="cursor-pointer rounded-2xl p-6 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-teal-600" />
              <div>
                <h3 className="font-semibold">Manage Facilities</h3>
                <p className="text-sm text-muted-foreground">View, suspend, or activate facilities</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/admin/users">
          <Card className="cursor-pointer rounded-2xl p-6 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold">Manage Users</h3>
                <p className="text-sm text-muted-foreground">View users, assign admin roles</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
