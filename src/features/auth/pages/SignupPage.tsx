import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Hotel, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { PasswordStrengthBar } from "@/components/PasswordStrength";

const signupSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupValues = z.infer<typeof signupSchema>;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
    </svg>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const passwordValue = watch("password");
  const formDisabled = isSubmitting || oauthLoading;

  async function onSubmit(values: SignupValues) {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.full_name } },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already been registered")) {
        setError("email", {
          message: "An account with this email already exists — log in instead",
        });
      } else if (error.message.toLowerCase().includes("password")) {
        setError("password", { message: error.message });
      } else {
        toast.error(error.message);
      }
      return;
    }

    if (!data.user) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    if (data.user.identities?.length === 0) {
      setError("email", {
        message: "An account with this email already exists — log in instead",
      });
      return;
    }

    if (!data.session) {
      navigate("/verify-email");
    } else {
      navigate("/onboarding");
    }
  }

  async function handleGoogleSignUp() {
    setOauthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) {
      toast.error(error.message);
      setOauthLoading(false);
    }
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
            Run your hotel, motel, or apartments from one dashboard.
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            Reservations, rooms, housekeeping, billing, and your team — all in one place.
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
              <div className="mb-6">
                <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get started with StayFlow — it's free.
                </p>
              </div>

              {/* Google OAuth */}
              <Button
                type="button"
                variant="outline"
                className="mb-6 w-full gap-2.5"
                onClick={handleGoogleSignUp}
                disabled={formDisabled}
              >
                {oauthLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="h-4 w-4" />
                )}
                Continue with Google
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Full name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    placeholder="Jane Doe"
                    autoComplete="name"
                    disabled={formDisabled}
                    aria-invalid={!!errors.full_name}
                    aria-describedby={errors.full_name ? "full_name-error" : undefined}
                    {...register("full_name")}
                  />
                  {errors.full_name && (
                    <p id="full_name-error" className="text-xs text-destructive" role="alert">
                      {errors.full_name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    disabled={formDisabled}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-xs text-destructive" role="alert">
                      {errors.email.message}{" "}
                      {errors.email.message?.includes("log in") && (
                        <Link to="/login" className="font-medium underline underline-offset-2">
                          Log in
                        </Link>
                      )}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      disabled={formDisabled}
                      className="pr-10"
                      aria-invalid={!!errors.password}
                      aria-describedby="password-hint"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <PasswordStrengthBar password={passwordValue} />

                  {errors.password && (
                    <p className="text-xs text-destructive" role="alert">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={formDisabled}
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Log in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
