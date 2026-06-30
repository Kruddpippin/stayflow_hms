import type { MembershipRole } from "@/types/db";

export const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Owner",
  manager: "Manager",
  front_desk: "Front Desk",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  accountant: "Accountant",
};

export const ROLE_COLORS: Record<MembershipRole, string> = {
  owner: "bg-violet-100 text-violet-700",
  manager: "bg-blue-100 text-blue-700",
  front_desk: "bg-emerald-100 text-emerald-700",
  housekeeping: "bg-amber-100 text-amber-700",
  maintenance: "bg-orange-100 text-orange-700",
  accountant: "bg-cyan-100 text-cyan-700",
};

export const ALL_ROLES: MembershipRole[] = [
  "owner", "manager", "front_desk", "housekeeping", "maintenance", "accountant",
];
