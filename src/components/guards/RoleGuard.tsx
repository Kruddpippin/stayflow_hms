import type { ReactNode } from "react";
import { useFacility } from "@/components/providers/FacilityProvider";
import type { MembershipRole } from "@/types/db";
import { ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  roles: MembershipRole[];
  children: ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { role, loading } = useFacility();

  if (loading) return null;

  if (!role || !roles.includes(role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h2 className="text-lg font-semibold">Access denied</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don't have permission to access this page. Contact your facility
          administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
