import { useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Hotel, CalendarDays, BedDouble, Users, MapPin,
  CreditCard, Loader2, AlertTriangle, Check, Printer, XCircle, Copy,
} from "lucide-react";
import { toast } from "sonner";

interface GuestBooking {
  id: string; booking_reference: string; check_in: string; check_out: string;
  status: string; payment_status: string; adults: number; children: number;
  total_amount: number; total_paid: number; balance: number;
  room_type: string; guest_name: string; guest_email: string;
  facility_name: string; facility_city: string | null; facility_country: string | null;
  currency: string; facility_logo: string | null; accent_color: string;
  cancellation_policy: string; payment_mode: string; payment_provider: string;
  payment_public_key: string; nights: number; created_at: string;
  error?: string;
}

export default function BookingDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [cancelling, setCancelling] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const { data: booking, isLoading, isError, refetch } = useQuery<GuestBooking>({
    queryKey: ["guest-booking", reference, email],
    enabled: !!reference && !!email,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_guest_booking", {
        p_reference: reference!, p_email: email,
      });
      if (error) throw error;
      return data as GuestBooking;
    },
  });

  if (!email) {
    return (
      <PageShell>
        <div className="text-center py-16">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Please look up your booking first.</p>
          <Link to="/booking"><Button variant="outline" className="mt-4">Go to lookup</Button></Link>
        </div>
      </PageShell>
    );
  }

  if (isLoading) {
    return <PageShell><div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></PageShell>;
  }

  if (isError || !booking || booking.error) {
    return (
      <PageShell>
        <div className="text-center py-16">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <h2 className="text-lg font-semibold">Booking not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">{booking?.error || "Check your reference and email."}</p>
          <Link to="/booking"><Button variant="outline" className="mt-4">Try again</Button></Link>
        </div>
      </PageShell>
    );
  }

  const accent = booking.accent_color;
  const isCancelled = booking.status === "cancelled";
  const isActive = ["confirmed", "checked_in"].includes(booking.status);
  const canPay = isActive && booking.balance > 0 && booking.payment_mode !== "pay_at_property" && booking.payment_provider;
  const canCancel = isActive && booking.status === "confirmed";

  async function handleCancel() {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc("request_guest_cancellation", {
        p_reference: reference!, p_email: email,
      });
      if (error) throw error;
      const result = data as Record<string, unknown>;
      if (result.error) throw new Error(result.error as string);
      toast.success("Booking cancelled.");
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel.");
    } finally {
      setCancelling(false);
    }
  }

  async function handlePay() {
    setPayLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/init-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          booking_reference: reference,
          email,
          callback_url: window.location.href,
        }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment initialization failed.");
    } finally {
      setPayLoading(false);
    }
  }

  // Check if returning from Paystack redirect — verify payment
  const urlRef = searchParams.get("reference") || searchParams.get("trxref");
  if (urlRef && booking.balance > 0) {
    return <VerifyingPayment providerRef={urlRef} bookingRef={reference!} onDone={() => refetch()} />;
  }

  return (
    <PageShell accent={accent} logo={booking.facility_logo} facilityName={booking.facility_name}>
      <div className="mx-auto max-w-lg space-y-6">
        {/* Status header */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: isCancelled ? "hsl(0 84% 60% / 0.1)" : accent + "15" }}>
            {isCancelled ? <XCircle className="h-7 w-7 text-destructive" /> : <Check className="h-7 w-7" style={{ color: accent }} />}
          </div>
          <h1 className="text-xl font-bold">{isCancelled ? "Booking cancelled" : "Your booking"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{booking.facility_name}</p>
        </div>

        {/* Reference */}
        <Card className="rounded-2xl p-5 text-center">
          <p className="text-xs text-muted-foreground">Booking reference</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-2xl font-bold tracking-wider">{booking.booking_reference}</p>
            <button onClick={() => { navigator.clipboard.writeText(booking.booking_reference); toast.success("Copied!"); }}
              className="rounded p-1 text-muted-foreground hover:bg-accent"><Copy className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <StatusBadge status={booking.status} />
            <PaymentBadge status={booking.payment_status} />
          </div>
        </Card>

        {/* Details */}
        <Card className="rounded-2xl p-5">
          <div className="space-y-3 text-sm">
            {(booking.facility_city || booking.facility_country) && (
              <Row icon={MapPin} label="Location" value={[booking.facility_city, booking.facility_country].filter(Boolean).join(", ")} />
            )}
            <Row icon={CalendarDays} label="Dates" value={`${format(new Date(booking.check_in), "MMM d")} → ${format(new Date(booking.check_out), "MMM d, yyyy")}`} />
            <Row icon={BedDouble} label="Room" value={booking.room_type} />
            <Row icon={Users} label="Guests" value={`${booking.adults + booking.children}`} />
            <hr />
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold">{booking.currency} {Number(booking.total_amount).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-emerald-700">{booking.currency} {Number(booking.total_paid).toLocaleString()}</span></div>
            {booking.balance > 0 && (
              <div className="flex justify-between font-medium"><span className="text-amber-700">Balance due</span><span className="text-amber-700">{booking.currency} {Number(booking.balance).toLocaleString()}</span></div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {canPay && (
            <Button className="w-full gap-2" size="lg" style={{ backgroundColor: accent }} onClick={handlePay} disabled={payLoading}>
              {payLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Pay {booking.currency} {Number(booking.balance).toLocaleString()}
            </Button>
          )}

          <Button variant="outline" className="w-full gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print confirmation
          </Button>

          {canCancel && (
            <Button variant="ghost" className="w-full gap-2 text-destructive hover:text-destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel booking
            </Button>
          )}

          {booking.cancellation_policy && (
            <p className="text-xs text-muted-foreground"><strong>Cancellation policy:</strong> {booking.cancellation_policy}</p>
          )}
        </div>
      </div>
    </PageShell>
  );
}

/* ---- Verifying payment state ---- */

function VerifyingPayment({ providerRef, bookingRef, onDone }: { providerRef: string; bookingRef: string; onDone: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["verify-payment", providerRef],
    queryFn: async () => {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ reference: providerRef, booking_reference: bookingRef }),
      });
      return resp.json();
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Verifying your payment…</p>
        </div>
      </PageShell>
    );
  }

  if (data?.verified) {
    // Remove the reference param and reload
    setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("reference");
      url.searchParams.delete("trxref");
      window.history.replaceState({}, "", url.toString());
      onDone();
    }, 1500);

    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold">Payment successful!</h2>
          <p className="text-sm text-muted-foreground">Loading your booking details…</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h2 className="text-lg font-semibold">Payment not confirmed</h2>
        <p className="text-sm text-muted-foreground">{data?.message || "Your payment could not be verified. You can try again from your booking page."}</p>
        <Button variant="outline" onClick={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("reference");
          url.searchParams.delete("trxref");
          window.history.replaceState({}, "", url.toString());
          onDone();
        }}>View booking</Button>
      </div>
    </PageShell>
  );
}

/* ---- Helpers ---- */

function PageShell({ children, accent, logo, facilityName }: { children: React.ReactNode; accent?: string; logo?: string | null; facilityName?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b" style={{ backgroundColor: accent ?? "#0F766E" }}>
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          {logo ? <img src={logo} alt="" className="h-9 w-9 rounded-lg object-cover" /> :
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><Hotel className="h-[18px] w-[18px] text-white" /></div>}
          <span className="text-base font-semibold text-white">{facilityName ?? "StayFlow"}</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">{children}</div>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Powered by <Link to="/" className="font-medium text-foreground hover:underline">StayFlow</Link>
      </footer>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-blue-100 text-blue-700", checked_in: "bg-emerald-100 text-emerald-700",
    checked_out: "bg-muted text-muted-foreground", cancelled: "bg-red-100 text-red-700",
    no_show: "bg-amber-100 text-amber-700",
  };
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${styles[status] ?? "bg-muted text-muted-foreground"}`}>{status.replace("_", " ")}</span>;
}

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unpaid: "bg-amber-100 text-amber-700", partial: "bg-blue-100 text-blue-700", paid: "bg-emerald-100 text-emerald-700",
  };
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${styles[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto text-right font-medium">{value}</span>
    </div>
  );
}
