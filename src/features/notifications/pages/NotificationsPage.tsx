import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useFacility } from "@/components/providers/FacilityProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface NotifRow {
  id: string; type: string; title: string; body: string | null;
  link: string | null; read: boolean; created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { facility } = useFacility();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading, isError, refetch } = useQuery<NotifRow[]>({
    queryKey: ["notifications-full", user?.id, facility?.id],
    enabled: !!user && !!facility,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, read, created_at")
        .eq("user_id", user!.id)
        .eq("facility_id", facility!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-full"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read: true })
        .eq("user_id", user!.id).eq("facility_id", facility!.id).eq("read", false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-full"] });
      toast.success("All marked as read.");
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>;
  if (isError) return <div className="flex flex-col items-center gap-3 py-16"><AlertTriangle className="h-8 w-8 text-destructive" /><Button variant="outline" onClick={() => refetch()}>Retry</Button></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            {markAllRead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />} Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <Card className="rounded-2xl p-0 divide-y">
          {notifications.map((n) => (
            <div key={n.id} className={cn("flex items-start gap-3 px-5 py-4", !n.read && "bg-primary/[0.02]")}>
              <div className="min-w-0 flex-1">
                {n.link ? (
                  <Link to={n.link} className="text-sm font-medium hover:text-primary hover:underline" onClick={() => { if (!n.read) markRead.mutate(n.id); }}>
                    {n.title}
                  </Link>
                ) : (
                  <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                )}
                {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
              {!n.read && (
                <button onClick={() => markRead.mutate(n.id)} className="mt-1 rounded p-1 text-muted-foreground hover:bg-accent" title="Mark read">
                  <span className="h-2 w-2 block rounded-full bg-primary" />
                </button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
