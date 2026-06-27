import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import type { Facility, Membership, MembershipRole } from "@/types/db";

interface FacilityContextValue {
  facility: Facility | null;
  membership: Membership | null;
  role: MembershipRole | null;
  memberships: Membership[];
  loading: boolean;
  switchFacility: (slug: string) => void;
}

const FacilityContext = createContext<FacilityContextValue | null>(null);

export function FacilityProvider({ children }: { children: ReactNode }) {
  const { facilitySlug } = useParams<{ facilitySlug: string }>();
  const { user } = useAuth();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!facilitySlug || !user) {
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);

      // Load facility by slug
      const { data: fac } = await supabase
        .from("facilities")
        .select("*")
        .eq("slug", facilitySlug)
        .single();

      if (!active || !fac) {
        if (active) {
          setFacility(null);
          setMembership(null);
          setLoading(false);
        }
        return;
      }

      setFacility(fac);

      // Load current user's membership for this facility
      const { data: mem } = await supabase
        .from("memberships")
        .select("*")
        .eq("facility_id", fac.id)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .single();

      if (active) setMembership(mem ?? null);

      // Load all memberships for this facility
      const { data: allMems } = await supabase
        .from("memberships")
        .select("*")
        .eq("facility_id", fac.id)
        .order("created_at");

      if (active) setMemberships(allMems ?? []);
      if (active) setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [facilitySlug, user]);

  function switchFacility(slug: string) {
    window.location.href = `/app/${slug}/dashboard`;
  }

  return (
    <FacilityContext.Provider
      value={{
        facility,
        membership,
        role: (membership?.role as MembershipRole) ?? null,
        memberships,
        loading,
        switchFacility,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  const ctx = useContext(FacilityContext);
  if (!ctx) throw new Error("useFacility must be used within FacilityProvider");
  return ctx;
}
