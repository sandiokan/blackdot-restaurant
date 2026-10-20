export type ReservationStatus = "confirmed" | "pending" | "cancelled" | "completed";
export type ServiceType = "Pranzo" | "Cena";
export type ReservationSource = "Telefono" | "Sito" | "WhatsApp" | "Walk-in";

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  lunchOpen: string;
  lunchClose: string;
  lunchCapacity: number;
  dinnerOpen: string;
  dinnerClose: string;
  dinnerCapacity: number;
  createdAt: string;
  updatedAt: string;
}

export type RestaurantUpdate = Omit<Restaurant, "id" | "createdAt" | "updatedAt">;

export type RestaurantThemeMode = "DARK" | "LIGHT";

export interface RestaurantBranding {
  restaurantId: string | null;
  displayName: string | null;
  logoPath: string | null;
  logoUrl: string | null;
  themeMode: RestaurantThemeMode;
  primaryColor: string;
  secondaryColor: string;
}

export interface RestaurantBrandingDraft {
  displayName: string;
  logoPath: string | null;
  logoUrl: string | null;
  themeMode: RestaurantThemeMode;
  primaryColor: string;
  secondaryColor: string;
}

export interface Reservation {
  id: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  guests: number;
  source: ReservationSource;
  status: ReservationStatus;
  note: string;
  table: string;
  service: ServiceType;
}

export type NewReservation = Omit<Reservation, "id">;

export type StaffArea = "Sala" | "Cucina" | "Bar" | "Amministrazione";
export type StaffStatus = "working" | "upcoming" | "absent";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  area: StaffArea;
  phone: string;
  email: string;
  status: StaffStatus;
  initials: string;
  accent: string;
}

export type StaffInput = Omit<StaffMember, "id" | "initials" | "accent">;

export type ShiftStatus = "scheduled" | "rest" | "cancelled";

export interface Shift {
  id: string;
  staffId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  area: StaffArea;
  status: ShiftStatus;
  notes: string;
}

export type ShiftInput = Omit<Shift, "id">;

export type RestaurantAccessRole = "OWNER" | "MANAGER" | "EMPLOYEE";

export interface RestaurantAccessRecord {
  id: string;
  userId: string;
  email: string | null;
  role: RestaurantAccessRole;
  createdAt: string;
}

export interface RestaurantAccessInvite {
  id: string;
  email: string;
  role: Exclude<RestaurantAccessRole, "OWNER">;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  createdAt: string;
  sentAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  invitedUserId: string | null;
}
