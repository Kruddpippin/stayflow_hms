/* Auto-generated-style types matching the Supabase schema. */

export type FacilityType = "hotel" | "motel" | "apartment" | "guesthouse" | "hostel" | "resort" | "bnb" | "other";
export type FacilityStatus = "setup" | "active" | "suspended";
export type MembershipRole = "owner" | "manager" | "front_desk" | "housekeeping" | "maintenance" | "accountant";
export type MembershipStatus = "active" | "disabled";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type RoomStatus = "available" | "occupied" | "dirty" | "clean" | "out_of_order";
export type ReservationStatus = "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
export type ReservationSource = "direct" | "walk_in" | "ota" | "phone";
export type InvoiceStatus = "draft" | "issued" | "paid" | "void";
export type PaymentMethod = "cash" | "card" | "transfer" | "pos" | "other";
export type HkTaskType = "cleaning" | "turnover" | "inspection";
export type TaskStatus = "pending" | "in_progress" | "done";
export type PriorityLevel = "low" | "medium" | "high" | "urgent";
export type OrderStatus = "open" | "in_progress" | "resolved";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export interface Facility {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  type: FacilityType;
  status: FacilityStatus;
  currency: string;
  timezone: string;
  check_in_time: string | null;
  check_out_time: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  description: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  facility_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  created_at: string;
}

export interface Invitation {
  id: string;
  facility_id: string;
  email: string;
  role: MembershipRole;
  token: string;
  status: InvitationStatus;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export interface RoomType {
  id: string;
  facility_id: string;
  name: string;
  description: string | null;
  base_rate: number;
  max_occupancy: number;
  total_units: number;
  photos: string[];
  created_at: string;
}

export interface Room {
  id: string;
  facility_id: string;
  room_type_id: string;
  name: string;
  floor: string | null;
  status: RoomStatus;
  created_at: string;
}

export interface RatePlan {
  id: string;
  facility_id: string;
  room_type_id: string;
  name: string;
  price: number;
  conditions: Record<string, unknown>;
  created_at: string;
}

export interface Guest {
  id: string;
  facility_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  id_document: string | null;
  nationality: string | null;
  notes: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  facility_id: string;
  guest_id: string;
  room_type_id: string;
  room_id: string | null;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  source: ReservationSource;
  adults: number;
  children: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  facility_id: string;
  reservation_id: string;
  number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  facility_id: string;
  invoice_id: string;
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  facility_id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  received_by: string | null;
  created_at: string;
}

export interface HousekeepingTask {
  id: string;
  facility_id: string;
  room_id: string;
  assigned_to: string | null;
  type: HkTaskType;
  status: TaskStatus;
  notes: string | null;
  due_date: string | null;
  created_at: string;
}

export interface MaintenanceOrder {
  id: string;
  facility_id: string;
  room_id: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  priority: PriorityLevel;
  status: OrderStatus;
  description: string;
  created_at: string;
}
