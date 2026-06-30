import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useAdminUsers, useDeleteUser, type AdminUser } from "../hooks/useAdminData";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import {
  Search, Loader2, Users, ShieldCheck, Building2, Trash2, X,
  Hotel, Mail, Phone, Calendar, BedDouble, CalendarDays, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading } = useAdminUsers();
  const deleteUser = useDeleteUser();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteInput, setDeleteInput] = useState("");

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.organizations.some((o) => o.toLowerCase().includes(search.toLowerCase()));
    return matchSearch && (filterRole === "all" || u.category === filterRole);
  });

  function handleDelete() {
    if (!confirmDelete || deleteInput !== confirmDelete.name) return;
    deleteUser.mutate(confirmDelete.id, {
      onSuccess: () => {
        toast.success("User deleted.");
        setConfirmDelete(null);
        setDeleteInput("");
        if (selectedUser?.id === confirmDelete.id) setSelectedUser(null);
      },
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
    <div className="flex h-full gap-6">
      {/* ---- Left: list ---- */}
      <div className="flex min-w-0 flex-1 flex-col space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.filter(u => u.category === "platform_admin").length} platform admin{users.filter(u => u.category === "platform_admin").length !== 1 ? "s" : ""} · {users.filter(u => u.category === "facility_owner").length} facility owner{users.filter(u => u.category === "facility_owner").length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or organization…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <NativeSelect value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-48">
            <option value="all">All users</option>
            <option value="platform_admin">Platform admins</option>
            <option value="facility_owner">Facility owners</option>
          </NativeSelect>
        </div>

        {filtered.length === 0 ? (
          <Card className="rounded-2xl p-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No users match your filters.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-xl border bg-card px-4 py-3 text-left transition-all hover:shadow-sm",
                  selectedUser?.id === u.id ? "border-primary ring-1 ring-primary/20" : "hover:border-border/80"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                  u.category === "platform_admin" ? "bg-red-600" : "bg-primary"
                )}>
                  {(u.full_name ?? u.email ?? "?").split(" ").map((w: string) => w[0]?.toUpperCase()).join("").slice(0, 2)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-sm">{u.full_name || "—"}</p>
                    {u.category === "platform_admin" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                        <ShieldCheck className="h-2.5 w-2.5" /> Admin
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email ?? "No email"}</p>
                </div>

                {/* Facility count */}
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-sm font-medium">{u.facilities.length}</p>
                  <p className="text-xs text-muted-foreground">facilit{u.facilities.length !== 1 ? "ies" : "y"}</p>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---- Right: detail panel ---- */}
      {selectedUser && (
        <div className="w-[360px] shrink-0">
          <Card className="sticky top-6 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white",
                  selectedUser.category === "platform_admin" ? "bg-red-600" : "bg-primary"
                )}>
                  {(selectedUser.full_name ?? selectedUser.email ?? "?").split(" ").map((w: string) => w[0]?.toUpperCase()).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold">{selectedUser.full_name || "Unnamed"}</p>
                  {selectedUser.category === "platform_admin" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      <ShieldCheck className="h-3 w-3" /> Platform Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                      <Building2 className="h-3 w-3" /> Facility Owner
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Details */}
            <div className="space-y-4 p-5">
              {/* Contact info */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{selectedUser.email ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{selectedUser.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>Joined {format(new Date(selectedUser.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              {/* Organizations */}
              {selectedUser.organizations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organizations</p>
                  <div className="space-y-1">
                    {selectedUser.organizations.map((o, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {o}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facilities */}
              {selectedUser.facilities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Facilities ({selectedUser.facilities.length})
                  </p>
                  <div className="space-y-2">
                    {selectedUser.facilities.map((f, i) => (
                      <div key={i} className="rounded-xl border bg-card p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {f.logo_url ? (
                            <img src={f.logo_url} alt="" className="h-7 w-7 rounded-md object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                              <Hotel className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{f.name}</p>
                            <span className={cn("text-[10px] font-medium capitalize",
                              f.status === "active" ? "text-emerald-600" :
                              f.status === "suspended" ? "text-red-600" : "text-muted-foreground"
                            )}>{f.status}</span>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {f.room_count} rooms</span>
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {f.reservation_count} reservations</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account stats */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3">
                <div className="text-center">
                  <p className="text-xl font-bold">{selectedUser.facilities.length}</p>
                  <p className="text-xs text-muted-foreground">Facilities</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">
                    {selectedUser.facilities.reduce((s, f) => s + f.reservation_count, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Reservations</p>
                </div>
              </div>

              {/* Delete action */}
              {selectedUser.id !== currentUser?.id && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => { setConfirmDelete({ id: selectedUser.id, name: selectedUser.full_name || selectedUser.email || selectedUser.id }); setDeleteInput(""); }}
                >
                  <Trash2 className="h-4 w-4" /> Delete this user
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ---- Delete confirmation dialog ---- */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-destructive">Delete user</h2>
              <button onClick={() => setConfirmDelete(null)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              This permanently deletes <span className="font-semibold text-foreground">{confirmDelete.name}</span> along with all their organisations, facilities, and data. This cannot be undone.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Type <span className="font-mono font-semibold text-foreground">{confirmDelete.name}</span> to confirm.
            </p>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={confirmDelete.name}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteInput !== confirmDelete.name || deleteUser.isPending}
                onClick={handleDelete}
                className="gap-2"
              >
                {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
