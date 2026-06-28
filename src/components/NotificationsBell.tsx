import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useFacility } from "@/components/providers/FacilityProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";

interface NotifRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const { facility } = useFacility();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery<NotifRow[]>({
    queryKey: ["notifications", user?.id, facility?.id],
    enabled: !!user && !!facility,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, read, created_at")
        .eq("user_id", user!.id)
        .eq("facility_id", facility!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Realtime subscription
  useEffect(() => {
    if (!user || !facility) return;
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["notifications", user.id, facility.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, facility, qc]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read: true })
        .eq("user_id", user!.id).eq("facility_id", facility!.id).eq("read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border bg-card shadow-lg" role="menu">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={() => markAllRead.mutate()}>
                <CheckCheck className="h-3 w-3" /> Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">You're all caught up.</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <NotifItem key={n.id} notif={n} slug={facility?.slug ?? ""} onRead={() => markRead.mutate(n.id)} onClose={() => setOpen(false)} />
              ))
            )}
          </div>
          {facility && (
            <div className="border-t px-4 py-2">
              <Link to={`/app/${facility.slug}/notifications`} onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary hover:underline">View all notifications</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotifItem({ notif, onRead, onClose }: { notif: NotifRow; slug?: string; onRead: () => void; onClose: () => void }) {
  function handleClick() {
    if (!notif.read) onRead();
    onClose();
  }

  const inner = (
    <div className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-accent", !notif.read && "bg-primary/[0.03]")}>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", !notif.read && "font-medium")}>{notif.title}</p>
        {notif.body && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{notif.body}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</p>
      </div>
      {!notif.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );

  return notif.link ? (
    <Link to={notif.link} onClick={handleClick}>{inner}</Link>
  ) : (
    <button className="w-full text-left" onClick={handleClick}>{inner}</button>
  );
}
