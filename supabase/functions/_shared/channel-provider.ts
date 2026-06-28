// Abstract Channel Provider interface
// Implement this for each channel manager (Hostaway, SiteMinder, etc.)

export interface ChannelConnection {
  id: string;
  facility_id: string;
  provider_id: string;
  external_account_id?: string;
  credentials_ref?: string;
}

export interface ChannelListing {
  id: string;
  channel_code: string;
  external_listing_id?: string;
  settings: Record<string, unknown>;
}

export interface OtaReservation {
  external_reservation_id: string;
  channel_code: string;
  status: string; // 'new' | 'modified' | 'cancelled'
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  external_room_id?: string;
  adults: number;
  children: number;
  total_amount: number;
  commission?: number;
  notes?: string;
}

export interface AvailabilityUpdate {
  external_room_id: string;
  dates: { date: string; available: number; rate?: number; min_los?: number }[];
}

export interface SyncResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface ChannelProvider {
  name: string;

  connect(connection: ChannelConnection, credentials: Record<string, string>): Promise<SyncResult>;
  disconnect(connection: ChannelConnection): Promise<SyncResult>;
  refreshConnection(connection: ChannelConnection): Promise<SyncResult>;

  listChannels(connection: ChannelConnection): Promise<{ channels: { code: string; name: string }[] }>;

  pushAvailability(connection: ChannelConnection, updates: AvailabilityUpdate[]): Promise<SyncResult>;
  pushRates(connection: ChannelConnection, updates: AvailabilityUpdate[]): Promise<SyncResult>;

  fetchReservations(connection: ChannelConnection, since?: string): Promise<{ reservations: OtaReservation[] }>;
  acknowledgeReservation(connection: ChannelConnection, externalId: string): Promise<SyncResult>;
}

// Mock adapter for development/testing
export class MockChannelProvider implements ChannelProvider {
  name = "mock";
  private reservations: OtaReservation[] = [];

  async connect(_conn: ChannelConnection, _creds: Record<string, string>): Promise<SyncResult> {
    return { success: true };
  }

  async disconnect(_conn: ChannelConnection): Promise<SyncResult> {
    return { success: true };
  }

  async refreshConnection(_conn: ChannelConnection): Promise<SyncResult> {
    return { success: true };
  }

  async listChannels(_conn: ChannelConnection) {
    return {
      channels: [
        { code: "booking_com", name: "Booking.com" },
        { code: "airbnb", name: "Airbnb" },
        { code: "expedia", name: "Expedia" },
        { code: "vrbo", name: "Vrbo" },
      ],
    };
  }

  async pushAvailability(_conn: ChannelConnection, _updates: AvailabilityUpdate[]): Promise<SyncResult> {
    console.log("[mock] pushAvailability", _updates.length, "room types");
    return { success: true };
  }

  async pushRates(_conn: ChannelConnection, _updates: AvailabilityUpdate[]): Promise<SyncResult> {
    console.log("[mock] pushRates", _updates.length, "room types");
    return { success: true };
  }

  async fetchReservations(_conn: ChannelConnection, _since?: string) {
    // Return any queued mock reservations
    const res = [...this.reservations];
    this.reservations = [];
    return { reservations: res };
  }

  async acknowledgeReservation(_conn: ChannelConnection, _externalId: string): Promise<SyncResult> {
    return { success: true };
  }

  // For testing: inject a mock OTA reservation
  injectReservation(res: OtaReservation) {
    this.reservations.push(res);
  }
}

// Hostaway adapter (stub — real implementation when HOSTAWAY_API_KEY is set)
export class HostawayChannelProvider implements ChannelProvider {
  name = "hostaway";
  private apiKey: string;
  private baseUrl = "https://api.hostaway.com/v1";

  constructor() {
    this.apiKey = Deno.env.get("HOSTAWAY_API_KEY") ?? "";
  }

  private async request(method: string, path: string, body?: unknown) {
    if (!this.apiKey) {
      console.log(`[hostaway] Stub call: ${method} ${path}`);
      return { success: true, data: null };
    }
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return resp.json();
  }

  async connect(conn: ChannelConnection, creds: Record<string, string>): Promise<SyncResult> {
    this.apiKey = creds.api_key ?? this.apiKey;
    try {
      await this.request("GET", "/me");
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  async disconnect(_conn: ChannelConnection): Promise<SyncResult> {
    return { success: true };
  }

  async refreshConnection(_conn: ChannelConnection): Promise<SyncResult> {
    return this.apiKey ? { success: true } : { success: false, error: "No API key" };
  }

  async listChannels(_conn: ChannelConnection) {
    return {
      channels: [
        { code: "booking_com", name: "Booking.com" },
        { code: "airbnb", name: "Airbnb" },
        { code: "expedia", name: "Expedia" },
        { code: "vrbo", name: "Vrbo" },
      ],
    };
  }

  async pushAvailability(conn: ChannelConnection, updates: AvailabilityUpdate[]): Promise<SyncResult> {
    if (!this.apiKey) return { success: true, data: "stub" };
    try {
      for (const u of updates) {
        await this.request("PUT", `/listings/${conn.external_account_id}/calendar`, {
          roomId: u.external_room_id,
          dates: u.dates,
        });
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  async pushRates(conn: ChannelConnection, updates: AvailabilityUpdate[]): Promise<SyncResult> {
    return this.pushAvailability(conn, updates); // Hostaway uses the same calendar endpoint
  }

  async fetchReservations(conn: ChannelConnection, since?: string) {
    if (!this.apiKey) return { reservations: [] };
    try {
      const qs = since ? `?updatedSince=${since}` : "";
      const data = await this.request("GET", `/reservations${qs}`);
      const reservations: OtaReservation[] = ((data as { result?: unknown[] })?.result ?? []).map((r: Record<string, unknown>) => ({
        external_reservation_id: String(r.id),
        channel_code: String(r.channelName ?? "unknown"),
        status: r.status === "cancelled" ? "cancelled" : "new",
        check_in: String(r.arrivalDate),
        check_out: String(r.departureDate),
        guest_name: String(r.guestName ?? "Guest"),
        guest_email: String(r.guestEmail ?? ""),
        adults: Number(r.numberOfGuests ?? 1),
        children: 0,
        total_amount: Number(r.totalPrice ?? 0),
        commission: Number(r.channelCommission ?? 0),
      }));
      return { reservations };
    } catch {
      return { reservations: [] };
    }
  }

  async acknowledgeReservation(_conn: ChannelConnection, _externalId: string): Promise<SyncResult> {
    return { success: true };
  }
}

export function getProvider(name: string): ChannelProvider {
  switch (name) {
    case "hostaway": return new HostawayChannelProvider();
    case "mock": return new MockChannelProvider();
    default: return new MockChannelProvider();
  }
}
