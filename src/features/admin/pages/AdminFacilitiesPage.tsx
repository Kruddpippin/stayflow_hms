import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useAdminFacilities, useUpdateFacilityStatus } from "../hooks/useAdminData";
import { cn } from "@/lib/utils";
import { Search, Loader2, Building2, MapPin, Users, BedDouble, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import type { FacilityStatus } from "@/types/db";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  setup: "bg-gray-100 text-gray-600",
};

export default function AdminFacilitiesPage() {
  const { data: facilities = [], isLoading } = useAdminFacilities();
  const updateStatus = useUpdateFacilityStatus();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = facilities.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.org_name.toLowerCase().includes(search.toLowerCase()) ||
      (f.city ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function handleStatusChange(id: string, status: FacilityStatus) {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => toast.success(`Facility ${status === "suspended" ? "suspended" : "activated"}.`),
      onError: (e) => toast.error(e.message),
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Facilities</h1>
        <p className="text-sm text-muted-foreground">
          {facilities.length} facilities registered on the platform.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, organization, or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <NativeSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-40">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="setup">Setup</option>
        </NativeSelect>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl p-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No facilities match your filters.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-5 py-3 font-medium">Facility</th>
                <th className="px-5 py-3 font-medium">Organization</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium text-center">Rooms</th>
                <th className="px-5 py-3 font-medium text-center">Staff</th>
                <th className="px-5 py-3 font-medium text-center">Reservations</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{f.type}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{f.org_name}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {f.city ?? "—"}, {f.country ?? "—"}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <BedDouble className="h-3.5 w-3.5" /> {f.room_count}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {f.member_count}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> {f.reservation_count}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", STATUS_BADGE[f.status])}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    {f.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleStatusChange(f.id, "suspended")}
                        disabled={updateStatus.isPending}
                      >
                        Suspend
                      </Button>
                    ) : f.status === "suspended" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={() => handleStatusChange(f.id, "active")}
                        disabled={updateStatus.isPending}
                      >
                        Activate
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
