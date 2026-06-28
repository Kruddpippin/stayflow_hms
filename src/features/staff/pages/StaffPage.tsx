import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  UserPlus, Users, Mail, Copy, RotateCcw, Trash2, Loader2,
  AlertTriangle, X, Ban, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { MembershipRole, MembershipStatus } from "@/types/db";

/* ------------------------------------------------------------------ */
/*  Role config                                                       */
/* ------------------------------------------------------------------ */

interface RoleOption {
  value: MembershipRole;
  label: string;
  description: string;
}

const ROLES: RoleOption[] = [
  { value: "owner", label: "Owner", description: "Full access, can manage all staff and settings" },
  { value: "manager", label: "Manager", description: "Manage operations, staff (except owners), and settings" },
  { value: "front_desk", label: "Front Desk", description: "Reservations, check-in/out, guests, rooms, invoices" },
  { value: "housekeeping", label: "Housekeeping", description: "View and update assigned cleaning tasks only" },
  { value: "maintenance", label: "Maintenance", description: "View and update assigned work orders only" },
  { value: "accountant", label: "Accountant", description: "Invoices, payments, and financial reports (read-heavy)" },
];

const ROLE_COLORS: Record<MembershipRole, string> = {
  owner: "bg-violet-100 text-violet-700",
  manager: "bg-blue-100 text-blue-700",
  front_desk: "bg-emerald-100 text-emerald-700",
  housekeeping: "bg-amber-100 text-amber-700",
  maintenance: "bg-orange-100 text-orange-700",
  accountant: "bg-cyan-100 text-cyan-700",
};

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MemberRow {
  id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: string;
  profile: { full_name: string | null; email?: string | null } | null;
}

interface InviteRow {
  id: string;
  email: string;
  role: MembershipRole;
  token: string;
  status: string;
  expires_at: string;
  created_at: string;
  inviter: { full_name: string | null } | null;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function StaffPage() {
  return (
    <RoleGuard roles={["owner", "manager"]}>
      <StaffContent />
    </RoleGuard>
  );
}

function StaffContent() {
  const { facility, role: myRole } = useFacility();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fid = facility?.id;
  const isOwner = myRole === "owner";

  const [tab, setTab] = useState<"members" | "invitations">("members");
  const [inviteOpen, setInviteOpen] = useState(false);

  // ---- Members ----
  const { data: members = [], isLoading: membersLoading } = useQuery<MemberRow[]>({
    queryKey: ["staff-members", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, user_id, role, status, created_at, profile:profiles(full_name)")
        .eq("facility_id", fid!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((m) => ({
        ...m,
        role: m.role as MembershipRole,
        status: m.status as MembershipStatus,
        profile: m.profile as unknown as MemberRow["profile"],
      }));
    },
  });

  // ---- Invitations ----
  const { data: invitations = [], isLoading: invLoading } = useQuery<InviteRow[]>({
    queryKey: ["staff-invitations", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, email, role, token, status, expires_at, created_at, inviter:profiles!invitations_invited_by_fkey(full_name)")
        .eq("facility_id", fid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((i) => ({
        ...i,
        role: i.role as MembershipRole,
        inviter: i.inviter as unknown as InviteRow["inviter"],
      }));
    },
  });

  const activeOwners = members.filter((m) => m.role === "owner" && m.status === "active");
  const pendingInvites = invitations.filter((i) => i.status === "pending");

  // ---- Mutations ----
  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: MembershipRole }) => {
      const { error } = await supabase.from("memberships").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-members", fid] }),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MembershipStatus }) => {
      const { error } = await supabase.from("memberships").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-members", fid] }),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("memberships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-members", fid] }),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").update({ status: "revoked" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-invitations", fid] }),
  });

  const resendInvite = useMutation({
    mutationFn: async (id: string) => {
      const newToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const { error } = await supabase.from("invitations")
        .update({ token: newToken, expires_at: expiresAt, status: "pending" })
        .eq("id", id);
      if (error) throw error;
      return newToken;
    },
    onSuccess: (token) => {
      qc.invalidateQueries({ queryKey: ["staff-invitations", fid] });
      copyInviteLink(token);
      toast.success("Invitation resent. Link copied.");
    },
  });

  // ---- Guards ----
  function canModifyMember(member: MemberRow): boolean {
    if (member.user_id === user?.id && activeOwners.length <= 1 && member.role === "owner") return false;
    if (!isOwner && member.role === "owner") return false;
    return true;
  }

  function isLastOwner(member: MemberRow): boolean {
    return member.role === "owner" && activeOwners.length <= 1;
  }

  function handleChangeRole(member: MemberRow, newRole: MembershipRole) {
    if (isLastOwner(member) && newRole !== "owner") {
      toast.error("Cannot demote the last owner. Promote another member to owner first.");
      return;
    }
    if (!isOwner && newRole === "owner") {
      toast.error("Only owners can promote to owner.");
      return;
    }
    changeRole.mutate({ id: member.id, role: newRole }, { onError: (e) => toast.error(e.message) });
  }

  function handleToggleStatus(member: MemberRow) {
    if (isLastOwner(member) && member.status === "active") {
      toast.error("Cannot disable the last owner.");
      return;
    }
    const newStatus: MembershipStatus = member.status === "active" ? "disabled" : "active";
    toggleStatus.mutate({ id: member.id, status: newStatus }, {
      onSuccess: () => toast.success(newStatus === "active" ? "Member re-enabled." : "Member disabled."),
      onError: (e) => toast.error(e.message),
    });
  }

  function handleRemove(member: MemberRow) {
    if (isLastOwner(member)) {
      toast.error("Cannot remove the last owner.");
      return;
    }
    if (!window.confirm(`Remove ${member.profile?.full_name ?? "this member"} from ${facility?.name}?`)) return;
    removeMember.mutate(member.id, {
      onSuccess: () => toast.success("Member removed."),
      onError: (e) => toast.error(e.message),
    });
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Invite link copied!"));
  }

  const isLoading = membersLoading || invLoading;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            {members.filter((m) => m.status === "active").length} active member{members.filter((m) => m.status === "active").length !== 1 ? "s" : ""}
            {pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending invite${pendingInvites.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite staff
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {([
          { key: "members" as const, label: "Members", count: members.length, icon: Users },
          { key: "invitations" as const, label: "Invitations", count: invitations.length, icon: Mail },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className={cn("rounded-full px-2 py-0.5 text-xs", tab === t.key ? "bg-primary/10" : "bg-muted")}>{t.count}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
      )}

      {/* Members tab */}
      {!isLoading && tab === "members" && (
        <Card className="rounded-2xl p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m) => {
                  const canMod = canModifyMember(m);
                  const isSelf = m.user_id === user?.id;
                  const roleLabel = ROLES.find((r) => r.value === m.role)?.label ?? m.role;

                  return (
                    <tr key={m.id} className="group hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                            {(m.profile?.full_name ?? "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{m.profile?.full_name ?? "User"}{isSelf ? " (you)" : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {canMod ? (
                          <NativeSelect
                            className="h-8 w-auto min-w-[140px] text-xs"
                            value={m.role}
                            onChange={(e) => handleChangeRole(m, e.target.value as MembershipRole)}
                            disabled={changeRole.isPending}
                          >
                            {ROLES.filter((r) => isOwner || r.value !== "owner").map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </NativeSelect>
                        ) : (
                          <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", ROLE_COLORS[m.role])}>{roleLabel}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium",
                          m.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                          {m.status === "active" ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{format(new Date(m.created_at), "MMM d, yyyy")}</td>
                      <td className="px-4 py-3">
                        {canMod && (
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              size="sm" variant="ghost" className="gap-1.5 text-xs"
                              disabled={toggleStatus.isPending}
                              onClick={() => handleToggleStatus(m)}
                              title={m.status === "active" ? "Disable" : "Re-enable"}
                            >
                              {m.status === "active" ? <Ban className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                              {m.status === "active" ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemove(m)}
                              disabled={removeMember.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {members.length <= 1 && (
            <div className="border-t px-5 py-6 text-center">
              <p className="text-sm text-muted-foreground">It's just you so far — invite your team to get started.</p>
              <Button variant="outline" className="mt-3 gap-2" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" /> Invite staff
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Invitations tab */}
      {!isLoading && tab === "invitations" && (
        <Card className="rounded-2xl p-0">
          {invitations.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No invitations sent yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Invited by</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invitations.map((inv) => {
                    const isExpired = new Date(inv.expires_at) < new Date() && inv.status === "pending";
                    const displayStatus = isExpired ? "expired" : inv.status;
                    const statusCls = {
                      pending: "bg-amber-100 text-amber-700",
                      accepted: "bg-emerald-100 text-emerald-700",
                      revoked: "bg-red-100 text-red-700",
                      expired: "bg-muted text-muted-foreground",
                    }[displayStatus] ?? "bg-muted text-muted-foreground";

                    return (
                      <tr key={inv.id} className="group hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{inv.email}</td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", ROLE_COLORS[inv.role])}>
                            {ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{inv.inviter?.full_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium capitalize", statusCls)}>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(inv.expires_at), "MMM d, yyyy")}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {(inv.status === "pending" || isExpired) && (
                              <>
                                <Button size="sm" variant="ghost" className="gap-1 text-xs"
                                  disabled={resendInvite.isPending}
                                  onClick={() => resendInvite.mutate(inv.id)}>
                                  <RotateCcw className="h-3 w-3" /> Resend
                                </Button>
                                <Button size="sm" variant="ghost" className="gap-1 text-xs"
                                  onClick={() => copyInviteLink(inv.token)}>
                                  <Copy className="h-3 w-3" /> Copy link
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (window.confirm("Revoke this invitation?"))
                                      revokeInvite.mutate(inv.id, { onSuccess: () => toast.success("Invitation revoked."), onError: (e) => toast.error(e.message) });
                                  }}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Role reference */}
      {tab === "members" && (
        <Card className="rounded-2xl p-5">
          <h3 className="mb-3 text-sm font-semibold">Role permissions</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.value} className="rounded-lg border p-3">
                <span className={cn("inline-block rounded-md px-2 py-0.5 text-[11px] font-medium", ROLE_COLORS[r.value])}>{r.label}</span>
                <p className="mt-1.5 text-xs text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invite dialog */}
      {inviteOpen && (
        <InviteDialog
          facilityId={fid!}
          facilityName={facility?.name ?? ""}
          isOwner={isOwner}
          pendingInvites={pendingInvites}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            setInviteOpen(false);
            qc.invalidateQueries({ queryKey: ["staff-invitations", fid] });
          }}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  Invite dialog                                                     */
/* ================================================================== */

function InviteDialog({ facilityId, facilityName, isOwner, pendingInvites, onClose, onSuccess }: {
  facilityId: string;
  facilityName: string;
  isOwner: boolean;
  pendingInvites: InviteRow[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("front_desk");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Check existing member (by joining profiles)
    // The DB unique constraint on (facility_id, user_id) will catch duplicate members

    // Check pending invite
    const existingInvite = pendingInvites.find((i) => i.email.toLowerCase() === trimmedEmail);
    if (existingInvite) {
      setError("A pending invitation already exists for this email. You can resend it from the Invitations tab.");
      return;
    }

    setSending(true);
    try {
      const { data: inv, error: invErr } = await supabase
        .from("invitations")
        .insert({
          facility_id: facilityId,
          email: trimmedEmail,
          role,
          invited_by: user!.id,
          status: "pending",
        })
        .select("token")
        .single();

      if (invErr) {
        if (invErr.message.includes("duplicate") || invErr.code === "23505") {
          setError("An invitation for this email already exists.");
        } else {
          throw invErr;
        }
        return;
      }

      // Copy invite link as fallback (email sending via Edge Function is optional)
      const url = `${window.location.origin}/invite/${inv.token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success(`Invitation created! Link copied to clipboard.`);
      } catch {
        toast.success("Invitation created!");
      }

      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create invitation.");
    } finally {
      setSending(false);
    }
  }

  const availableRoles = ROLES.filter((r) => isOwner || r.value !== "owner");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">Invite to {facilityName}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Email address *</Label>
            <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="colleague@email.com" />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div className="space-y-2">
              {availableRoles.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    role === r.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-0.5 h-4 w-4 border-input text-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send invitation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
