import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

async function isPlatformAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", userId)
    .single();
  return data?.platform_role === "admin";
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        if (await isPlatformAdmin(session.user.id)) {
          await supabase.auth.signOut();
          navigate("/login?blocked=1", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        if (await isPlatformAdmin(session.user.id)) {
          await supabase.auth.signOut();
          navigate("/login?blocked=1", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
