import type { FacilityType } from "@/types/db";

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  hotel: "Hotel",
  motel: "Motel",
  apartment: "Serviced Apartments",
  guesthouse: "Guesthouse",
  hostel: "Hostel",
  resort: "Resort",
  bnb: "Bed & Breakfast",
  other: "Other",
};

export const FACILITY_TYPE_ICONS: Record<FacilityType, string> = {
  hotel: "🏨",
  motel: "🏩",
  apartment: "🏢",
  guesthouse: "🏠",
  hostel: "🛏️",
  resort: "🏖️",
  bnb: "☕",
  other: "🏗️",
};

/** Teal brand color used throughout the app */
export const BRAND_COLOR = "#0F766E";
