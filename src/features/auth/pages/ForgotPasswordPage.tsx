import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Hotel, ArrowLeft, Loader2, Mail, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

const RESEND_COOLDOWN = 30;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendReset = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error("Something went wrong. Please try again.");
        return false;
      }
      return true;
    },
    []
  );

  async function onSubmit(values: ForgotValues) {
    const ok = await sendReset(values.email);
    if (ok) {
      setSentEmail(values.email);
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    }
  }

  async function handleResend() {
    const email = sentEmail || getValues("email");
    if (!email) return;
    setCooldown(RESEND_COOLDOWN);
    const ok = await sendReset(email);
    if (ok) toast.success("Reset link resent.");
  }

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
            It happens to the best of&nbsp;us.
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="relative p-10">
          <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} StayFlow</p>
        </div>
      </div>

      {/* Right form panel */}
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
              {!sent ? (
                <>
                  <div className="mb-6">
                    <h1 className="text-xl font-semibold tracking-tight">
                      Forgot your password?
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter your email and we'll send a reset link.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                    noValidate
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        autoComplete="email"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.email}
                        aria-describedby={
                          errors.email ? "email-error" : undefined
                        }
                        {...register("email")}
                      />
                      {errors.email && (
                        <p
                          id="email-error"
                          className="text-xs text-destructive"
                          role="alert"
                        >
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={isSubmitting}
                      size="lg"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Send reset link
                          <Mail className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                /* ---- Success / confirmation state ---- */
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Check your email
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    If an account exists for{" "}
                    <span className="font-medium text-foreground">
                      {sentEmail}
                    </span>
                    , a reset link is on its way.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 gap-2"
                    onClick={handleResend}
                    disabled={cooldown > 0}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
                  </Button>
                </div>
              )}

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:text-primary/80 hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
