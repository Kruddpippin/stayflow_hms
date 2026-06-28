import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useFacility } from "@/components/providers/FacilityProvider";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus, RefreshCw, Loader2, AlertTriangle, Wifi, WifiOff,
  Globe, X, Pause, Play,
} from "lucide-react";
import { toast } from "sonner";

interface Connection {
  id: string; facility_id: string; provider_id: string; status: string;
  external_account_id: string | null; last_synced_at: string | null; last_error: string | null;
  provider: { id: string; name: string } | null;
}

interface Listing {
  id: string; channel_code: string; status: string; external_listing_id: string | null;
  connection_id: string;
}

interface SyncLog {
  id: string; direction: string; entity: string; status: string;
  detail: Record<string, unknown>; created_at: string;
}

const CHANNEL_NAMES: Record<string, string> = {
  booking_com: "Booking.com", airbnb: "Airbnb", expedia: "Expedia", vrbo: "Vrbo",
};

const STATUS_STYLE: Record<string, { cls: string; icon: React.ElementType }> = {
  connected: { cls: "bg-emerald-100 text-emerald-700", icon: Wifi },
  connecting: { cls: "bg-amber-100 text-amber-700", icon: RefreshCw },
  disconnected: { cls: "bg-muted text-muted-foreground", icon: WifiOff },
  error: { cls: "bg-red-100 text-red-700", icon: AlertTriangle },
};

export default function ChannelsPage() {
  return (
    <RoleGuard roles={["owner", "manager"]}>
      <ChannelsContent />
    </RoleGuard>
  );
}

function ChannelsContent() {
  const { facility } = useFacility();
  const qc = useQueryClient();
  const fid = facility?.id;

  const [connectOpen, setConnectOpen] = useState(false);

  const { data: connections = [], isLoading: connLoading } = useQuery<Connection[]>({
    queryKey: ["channels-connections", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_channel_connections")
        .select("*, provider:channel_providers(id, name)")
        .eq("facility_id", fid!);
      if (error) throw error;
      return (data ?? []).map((c) => ({ ...c, provider: c.provider as unknown as Connection["provider"] }));
    },
  });

  const { data: listings = [] } = useQuery<Listing[]>({
    queryKey: ["channels-listings", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_listings")
        .select("id, channel_code, status, external_listing_id, connection_id")
        .eq("facility_id", fid!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: logs = [] } = useQuery<SyncLog[]>({
    queryKey: ["channels-logs", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_sync_log")
        .select("id, direction, entity, status, detail, created_at")
        .eq("facility_id", fid!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const syncNow = useMutation({
    mutationFn: async (connectionId: string) => {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/channels-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: "pull_reservations", facility_id: fid, connection_id: connectionId }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Synced: ${data.processed ?? 0} reservations processed.`);
      qc.invalidateQueries({ queryKey: ["channels-connections", fid] });
      qc.invalidateQueries({ queryKey: ["channels-logs", fid] });
      qc.invalidateQueries({ queryKey: ["reservations", fid] });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleListing = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "paused" : "active";
      const { error } = await supabase.from("channel_listings").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels-listings", fid] });
      toast.success("Channel updated.");
    },
  });

  const activeConnection = connections.find((c) => c.status === "connected");

  if (connLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Channels</h1>
          <p className="text-sm text-muted-foreground">
            {connections.length === 0 ? "Connect a channel manager to distribute your inventory" : `${connections.length} provider${connections.length !== 1 ? "s" : ""} configured`}
          </p>
        </div>
        <div className="flex gap-2">
          {activeConnection && (
            <Button variant="outline" className="gap-2" disabled={syncNow.isPending}
              onClick={() => syncNow.mutate(activeConnection.id)}>
              {syncNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync now
            </Button>
          )}
          <Button className="gap-2" onClick={() => setConnectOpen(true)}>
            <Plus className="h-4 w-4" /> Connect provider
          </Button>
        </div>
      </div>

      {/* Connections */}
      {connections.map((conn) => {
        const st = STATUS_STYLE[conn.status] ?? STATUS_STYLE.disconnected;
        const StIcon = st.icon;
        const connListings = listings.filter((l) => l.connection_id === conn.id);

        return (
          <Card key={conn.id} className="rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold capitalize">{conn.provider?.name ?? "Provider"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium", st.cls)}>
                      <StIcon className="h-3 w-3" /> {conn.status}
                    </span>
                    {conn.last_synced_at && (
                      <span className="text-xs text-muted-foreground">
                        Last sync: {format(new Date(conn.last_synced_at), "MMM d, h:mm a")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={syncNow.isPending}
                onClick={() => syncNow.mutate(conn.id)}>
                <RefreshCw className="h-3.5 w-3.5" /> Sync
              </Button>
            </div>

            {conn.last_error && (
              <div className="mt-3 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">{conn.last_error}</div>
            )}

            {/* Channel listings */}
            {connListings.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channels</p>
                {connListings.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full",
                        l.status === "active" ? "bg-emerald-500" : l.status === "paused" ? "bg-amber-500" : "bg-muted-foreground"
                      )} />
                      <span className="text-sm font-medium">{CHANNEL_NAMES[l.channel_code] ?? l.channel_code}</span>
                      <span className="text-xs text-muted-foreground capitalize">{l.status}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="gap-1 text-xs"
                        onClick={() => toggleListing.mutate({ id: l.id, status: l.status })}>
                        {l.status === "active" ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {connections.length === 0 && (
        <Card className="flex flex-col items-center gap-4 rounded-2xl py-16 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="font-semibold">No channel providers connected</p>
            <p className="mt-1 text-sm text-muted-foreground">Connect a channel manager to distribute your rooms across Booking.com, Airbnb, Expedia, and more.</p>
          </div>
          <Button className="gap-2" onClick={() => setConnectOpen(true)}><Plus className="h-4 w-4" /> Connect provider</Button>
        </Card>
      )}

      {/* Sync log */}
      {logs.length > 0 && (
        <Card className="rounded-2xl p-0">
          <div className="border-b px-5 py-4">
            <h3 className="text-sm font-semibold">Recent activity</h3>
          </div>
          <div className="divide-y">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase",
                    l.direction === "push" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"
                  )}>{l.direction}</span>
                  <span className="capitalize">{l.entity}</span>
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                    l.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  )}>{l.status}</span>
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(l.created_at), "MMM d, h:mm a")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Connect dialog */}
      {connectOpen && (
        <ConnectProviderDialog
          facilityId={fid!}
          existingProviders={connections.map((c) => c.provider?.name ?? "")}
          onClose={() => setConnectOpen(false)}
          onSuccess={() => {
            setConnectOpen(false);
            qc.invalidateQueries({ queryKey: ["channels-connections", fid] });
          }}
        />
      )}
    </div>
  );
}

/* ---- Connect provider dialog ---- */

function ConnectProviderDialog({ facilityId, existingProviders, onClose, onSuccess }: {
  facilityId: string; existingProviders: string[]; onClose: () => void; onSuccess: () => void;
}) {
  const [providerName, setProviderName] = useState("mock");
  const [accountId, setAccountId] = useState("");
  const [connecting, setConnecting] = useState(false);

  const { data: providers = [] } = useQuery({
    queryKey: ["channel-providers"],
    queryFn: async () => {
      const { data } = await supabase.from("channel_providers").select("id, name").eq("is_active", true);
      return (data ?? []).filter((p) => !existingProviders.includes(p.name));
    },
  });

  async function handleConnect() {
    setConnecting(true);
    try {
      const provider = providers.find((p) => p.name === providerName);
      if (!provider) throw new Error("Select a provider");

      const { data: conn, error } = await supabase
        .from("facility_channel_connections")
        .insert({
          facility_id: facilityId,
          provider_id: provider.id,
          status: "connecting",
          external_account_id: accountId || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Create default channel listings
      const channels = ["booking_com", "airbnb", "expedia", "vrbo"];
      await supabase.from("channel_listings").insert(
        channels.map((ch) => ({
          facility_id: facilityId,
          connection_id: conn.id,
          channel_code: ch,
          status: "draft",
        }))
      );

      // Test connection
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/channels-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: "connect", facility_id: facilityId, connection_id: conn.id }),
      });

      toast.success("Provider connected!");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">Connect channel provider</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Provider</Label>
            <NativeSelect value={providerName} onChange={(e) => setProviderName(e.target.value)}>
              {providers.map((p) => (
                <option key={p.id} value={p.name}>{p.name === "mock" ? "Mock (Development)" : p.name.charAt(0).toUpperCase() + p.name.slice(1)}</option>
              ))}
            </NativeSelect>
          </div>

          {providerName !== "mock" && (
            <div className="space-y-2">
              <Label>Account ID / API Key</Label>
              <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Your provider account identifier" />
              <p className="text-[11px] text-muted-foreground">
                API secret keys are stored securely in the server environment, not in the database.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={connecting} className="gap-2" onClick={handleConnect}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Connect
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
