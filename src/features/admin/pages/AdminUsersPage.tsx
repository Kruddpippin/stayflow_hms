import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useAdminUsers, useUpdatePlatformRole } from "../hooks/useAdminData";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Search, Loader2, Users, ShieldCheck, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading } = useAdminUsers();
  const updateRole = useUpdatePlatformRole();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.organizations.some((o) => o.toLowerCase().includes(search.toLowerCase()));
    const matchRole = filterRole === "all" || u.platform_role === filterRole;
    return matchSearch && matchRole;
  });

  function handleRoleChange(id: string, role: "user" | "admin") {
    if (id === currentUser?.id) {
      toast.error("You cannot change your own admin role.");
      return;
    }
    updateRole.mutate({ id, role }, {
      onSuccess: () => toast.success(`User ${role === "admin" ? "promoted to admin" : "demoted to user"}.`),
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
        <h1 className="text-2xl font-bold tracking-tight">All Users</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} registered users on the platform.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or organization…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <NativeSelect value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-40">
          <option value="all">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </NativeSelect>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No users match your filters.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Organizations</th>
                <th className="px-5 py-3 font-medium">Facility Roles</th>
                <th className="px-5 py-3 font-medium">Platform Role</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {(u.full_name ?? "?").split(" ").map((w: string) => w[0]?.toUpperCase()).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.phone || "No phone"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {u.organizations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.organizations.map((o, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                            <Building2 className="h-3 w-3" /> {o}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {u.memberships.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.memberships.slice(0, 3).map((m, i) => (
                          <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs">
                            {m.role} @ {m.facility_name}
                          </span>
                        ))}
                        {u.memberships.length > 3 && (
                          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            +{u.memberships.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No memberships</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      u.platform_role === "admin" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {u.platform_role === "admin" && <ShieldCheck className="h-3 w-3" />}
                      {u.platform_role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    {u.id === currentUser?.id ? (
                      <span className="text-xs text-muted-foreground">You</span>
                    ) : u.platform_role === "admin" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRoleChange(u.id, "user")}
                        disabled={updateRole.isPending}
                      >
                        Remove admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleRoleChange(u.id, "admin")}
                        disabled={updateRole.isPending}
                      >
                        Make admin
                      </Button>
                    )}
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
