import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordStrengthBar } from "@/components/PasswordStrength";
import { Hotel, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const resetSchema = z
  .object({
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type ResetValues = z.infer<typeof resetSchema>;

type PageState = "loading" | "form" | "success" | "expired";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const newPasswordValue = watch("new_password");

  useEffect(() => {
    // Supabase JS client automatically picks up the recovery token from the
    // URL hash and fires a PASSWORD_RECOVERY event, which gives us a session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("form");
      }
    });

    // If the user already has a session when the page mounts (e.g. the
    // auth event already fired before this component rendered), allow them
    // to proceed with the form.
    if (session) {
      setPageState("form");
    }

    // Give the Supabase client a moment to process the hash, then fall back
    // to the expired state if no recovery event has fired.
    const timeout = setTimeout(() => {
      setPageState((current) => (current === "loading" ? "expired" : current));
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: ResetValues) {
    const { error } = await supabase.auth.updateUser({
      password: values.new_password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setPageState("success");

    setTimeout(() => {
      navigate(session ? "/onboarding" : "/login", { replace: true });
    }, 2500);
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
            Set a new password.
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            Choose a strong password to keep your account secure.
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
              {/* ---- Loading ---- */}
              {pageState === "loading" && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Verifying your reset link…
                  </p>
                </div>
              )}

              {/* ---- Expired / Invalid ---- */}
              {pageState === "expired" && (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Invalid or expired link
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This reset link has expired or has already been used. Request a
                    new one to continue.
                  </p>
                  <Link to="/forgot-password">
                    <Button className="mt-6 gap-2">
                      Request a new link
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}

              {/* ---- Form ---- */}
              {pageState === "form" && (
                <>
                  <div className="mb-6">
                    <h1 className="text-xl font-semibold tracking-tight">
                      Set a new password
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose a strong password for your account.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                    noValidate
                  >
                    {/* New password */}
                    <div className="space-y-2">
                      <Label htmlFor="new_password">New password</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showPw ? "text" : "password"}
                          placeholder="Min. 8 characters"
                          autoComplete="new-password"
                          disabled={isSubmitting}
                          className="pr-10"
                          aria-invalid={!!errors.new_password}
                          aria-describedby="new-pw-hint"
                          {...register("new_password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={showPw ? "Hide password" : "Show password"}
                          tabIndex={-1}
                        >
                          {showPw ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div id="new-pw-hint">
                        <PasswordStrengthBar password={newPasswordValue} />
                      </div>
                      {errors.new_password && (
                        <p className="text-xs text-destructive" role="alert">
                          {errors.new_password.message}
                        </p>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirm password</Label>
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type={showConfirm ? "text" : "password"}
                          placeholder="Re-enter your password"
                          autoComplete="new-password"
                          disabled={isSubmitting}
                          className="pr-10"
                          aria-invalid={!!errors.confirm_password}
                          aria-describedby={
                            errors.confirm_password
                              ? "confirm-pw-error"
                              : undefined
                          }
                          {...register("confirm_password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={
                            showConfirm ? "Hide password" : "Show password"
                          }
                          tabIndex={-1}
                        >
                          {showConfirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {errors.confirm_password && (
                        <p
                          id="confirm-pw-error"
                          className="text-xs text-destructive"
                          role="alert"
                        >
                          {errors.confirm_password.message}
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
                        "Update password"
                      )}
                    </Button>
                  </form>
                </>
              )}

              {/* ---- Success ---- */}
              {pageState === "success" && (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Password updated
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Redirecting you now…
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
