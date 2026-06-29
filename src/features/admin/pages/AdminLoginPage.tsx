import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && profile?.platform_role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [profile, loading, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setAuthError("Invalid credentials.");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("platform_role")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .single();

    if (data?.platform_role !== "admin") {
      await supabase.auth.signOut();
      setAuthError("Access denied. This login is for platform administrators only.");
      return;
    }

    navigate("/admin/dashboard", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white">StayFlow Admin</h1>
            <p className="text-sm text-gray-400">Platform administration console</p>
          </div>
        </div>

        <Card className="rounded-2xl border-gray-800 bg-gray-900 shadow-2xl">
          <CardContent className="p-7">
            {authError && (
              <div className="mb-5 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@stayflow.com"
                  autoComplete="email"
                  disabled={isSubmitting}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-red-600/20"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="border-gray-700 bg-gray-800 pr-10 text-white placeholder:text-gray-500 focus:border-red-600 focus:ring-red-600/20"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-gray-500 hover:text-gray-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2 bg-red-600 hover:bg-red-700"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign in to Admin
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-gray-500">
              Restricted access. Unauthorized attempts are logged.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
