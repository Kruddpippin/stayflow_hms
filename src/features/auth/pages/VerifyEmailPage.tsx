import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Hotel, MailCheck, Loader2, RotateCcw, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const RESEND_COOLDOWN = 30;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [searchParams] = useSearchParams();

  const email = user?.email ?? searchParams.get("email") ?? null;

  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-forward: listen for confirmation completing in any tab
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "SIGNED_IN" && sess) {
        navigate("/onboarding", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // If the user already has a confirmed session when this page mounts, forward
  useEffect(() => {
    if (session?.user?.email_confirmed_at) {
      navigate("/onboarding", { replace: true });
    }
  }, [session, navigate]);

  const handleResend = useCallback(async () => {
    if (!email) {
      toast.error("No email address available. Please sign up again.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);

    if (error) {
      if (error.message.toLowerCase().includes("rate") ||
          error.message.toLowerCase().includes("limit")) {
        toast.error("Too many requests — please wait a moment before trying again.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Confirmation email resent.");
    setCooldown(RESEND_COOLDOWN);
  }, [email]);

  async function handleContinue() {
    setChecking(true);
    setNotYet(false);

    const { data } = await supabase.auth.getSession();

    if (data.session) {
      navigate("/onboarding", { replace: true });
    } else {
      setNotYet(true);
    }
    setChecking(false);
  }

  const resendDisabled = resending || cooldown > 0;

  return (
    <div className="grid min-h-screen lg:grid-cols-5">
      {/* Left brand panel */}
      <div
        className="relative hidden overflow-hidden lg:col-span-2 lg:flex lg:flex-col lg:justify-between"
        style={{ backgroundColor: "#0F766E" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F766E] via-[#0D6B63] to-[#0A5C55]" />
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative p-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <Hotel className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="text-base font-semibold text-white">StayFlow</span>
          </div>
        </div>

        <div className="relative space-y-5 px-10">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            One last step.
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            Confirm your email to activate your account and start managing your
            property.
          </p>
        </div>

        <div className="relative p-10">
          <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} StayFlow</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 lg:col-span-3">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hotel className="h-[18px] w-[18px]" />
            </div>
            <span className="text-base font-semibold">StayFlow</span>
          </div>

          <Card className="rounded-2xl border-border/60 shadow-lg shadow-black/[0.04]">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <MailCheck className="h-7 w-7 text-primary" />
                </div>

                <h1 className="text-xl font-semibold tracking-tight">
                  Confirm your email
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a confirmation link to{" "}
                  {email ? (
                    <span className="font-medium text-foreground">{email}</span>
                  ) : (
                    "your email"
                  )}
                  . Click it to activate your StayFlow account.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-8 space-y-3">
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleContinue}
                  disabled={checking}
                >
                  {checking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      I've confirmed — continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleResend}
                  disabled={resendDisabled}
                >
                  {resending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Resend confirmation email"}
                </Button>
              </div>

              {/* Not-yet-confirmed hint */}
              <div aria-live="polite" className="mt-4 min-h-[1.5rem]">
                {notYet && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-800">
                    We can't see a confirmed session yet — click the link in your
                    email, then try again.
                  </p>
                )}
              </div>

              {/* Footer links */}
              <div className="mt-6 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Wrong email?{" "}
                  <Link
                    to="/signup"
                    className="font-medium text-primary underline-offset-2 hover:text-primary/80 hover:underline"
                  >
                    Sign up again
                  </Link>
                </span>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:text-primary/80 hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
