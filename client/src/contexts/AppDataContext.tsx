import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addLocalDays, DEFAULT_RESTAURANT_TIME_ZONE, getLocalDateKey, getLocalTimeKey } from "@/lib/localDate";
import { countCovers, reservationsForDate } from "@/lib/reservationMetrics";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { NewReservation, Reservation, Restaurant, RestaurantUpdate, Shift, ShiftInput, StaffArea, StaffInput, StaffMember } from "@/types/models";

type DatabaseRestaurant = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  lunch_open: string;
  lunch_close: string;
  lunch_capacity: number;
  dinner_open: string;
  dinner_close: string;
  dinner_capacity: number;
  created_at: string;
  updated_at: string;
};

type DatabaseReservation = {
  id: string;
  customer_name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  service: Reservation["service"];
  source: Reservation["source"];
  status: Reservation["status"];
  notes: string;
  table_name: string;
};

type DatabaseStaff = {
  id: string;
  name: string;
  role: string;
  area: StaffMember["area"];
  phone: string;
  email: string;
  status: StaffMember["status"];
};

type DatabaseShift = {
  id: string;
  staff_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  area: Shift["area"];
  status: Shift["status"];
  notes: string;
};

interface AppDataContextValue {
  currentDate: string;
  restaurant: Restaurant | null;
  reservations: Reservation[];
  staff: StaffMember[];
  shifts: Shift[];
  activeReservations: Reservation[];
  lunchCovers: number;
  dinnerCovers: number;
  totalCovers: number;
  staffOnDuty: StaffMember[];
  staffOnDutyByArea: Record<StaffArea, number>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  reloadData: () => Promise<void>;
  saveRestaurant: (restaurant: RestaurantUpdate) => Promise<Restaurant>;
  addReservation: (reservation: NewReservation) => Promise<Reservation>;
  updateReservationStatus: (id: string, status: Reservation["status"]) => Promise<Reservation>;
  addStaff: (person: StaffInput) => Promise<StaffMember>;
  updateStaff: (id: string, person: StaffInput) => Promise<StaffMember>;
  addShift: (shift: ShiftInput) => Promise<Shift>;
  updateShift: (id: string, shift: ShiftInput) => Promise<Shift>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function cleanTime(value: string) {
  return value.slice(0, 5);
}

function mapRestaurant(row: DatabaseRestaurant): Restaurant {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    lunchOpen: cleanTime(row.lunch_open),
    lunchClose: cleanTime(row.lunch_close),
    lunchCapacity: row.lunch_capacity,
    dinnerOpen: cleanTime(row.dinner_open),
    dinnerClose: cleanTime(row.dinner_close),
    dinnerCapacity: row.dinner_capacity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReservation(row: DatabaseReservation): Reservation {
  return {
    id: row.id,
    date: row.date,
    time: cleanTime(row.time),
    name: row.customer_name,
    phone: row.phone,
    guests: row.guests,
    source: row.source,
    status: row.status,
    note: row.notes,
    table: row.table_name,
    service: row.service,
  };
}

const staffAccents: Record<StaffArea, string> = {
  Sala: "#d89a67",
  Cucina: "#cab18b",
  Bar: "#85665d",
  Amministrazione: "#6e8b7d",
};

function mapStaff(row: DatabaseStaff): StaffMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    area: row.area,
    phone: row.phone,
    email: row.email,
    status: row.status,
    initials: row.name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase(),
    accent: staffAccents[row.area],
  };
}

function mapShift(row: DatabaseShift): Shift {
  return {
    id: row.id,
    staffId: row.staff_id,
    date: row.date,
    startTime: row.start_time ? cleanTime(row.start_time) : null,
    endTime: row.end_time ? cleanTime(row.end_time) : null,
    area: row.area,
    status: row.status,
    notes: row.notes,
  };
}

function sortReservations(items: Reservation[]) {
  return [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function sortShifts(items: Shift[]) {
  return [...items].sort((a, b) => `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.startTime ?? ""}`));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function shiftIncludesDateTime(shift: Shift, date: string, time: string) {
  if (shift.status !== "scheduled" || !shift.startTime || !shift.endTime) return false;
  if (shift.startTime <= shift.endTime) return shift.date === date && shift.startTime <= time && time < shift.endTime;
  return (shift.date === date && time >= shift.startTime) || (addLocalDays(shift.date, 1) === date && time < shift.endTime);
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [currentDate, setCurrentDate] = useState(() => getLocalDateKey(new Date(), DEFAULT_RESTAURANT_TIME_ZONE));
  const [currentTime, setCurrentTime] = useState(() => getLocalTimeKey(new Date(), DEFAULT_RESTAURANT_TIME_ZONE));
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const reloadData = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setError("Configurazione Supabase non disponibile.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: restaurantRow, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (restaurantError) throw restaurantError;
      if (!restaurantRow) throw new Error("Nessun ristorante configurato. Applica la migration Supabase.");

      const currentRestaurant = mapRestaurant(restaurantRow as DatabaseRestaurant);
      const [reservationsResult, staffResult, shiftsResult] = await Promise.all([
        supabase.from("reservations").select("*").eq("restaurant_id", currentRestaurant.id).order("date", { ascending: true }).order("time", { ascending: true }),
        supabase.from("staff").select("*").eq("restaurant_id", currentRestaurant.id).order("name", { ascending: true }),
        supabase.from("shifts").select("*").eq("restaurant_id", currentRestaurant.id).order("date", { ascending: true }).order("start_time", { ascending: true }),
      ]);

      if (reservationsResult.error) throw reservationsResult.error;
      setRestaurant(currentRestaurant);
      setReservations(sortReservations((reservationsResult.data ?? []).map((row) => mapReservation(row as DatabaseReservation))));

      if (staffResult.error) throw staffResult.error;
      if (shiftsResult.error) throw shiftsResult.error;
      setStaff((staffResult.data ?? []).map((row) => mapStaff(row as DatabaseStaff)));
      setShifts(sortShifts((shiftsResult.data ?? []).map((row) => mapShift(row as DatabaseShift))));
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Errore durante il caricamento dei dati."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

  useEffect(() => {
    const refreshCurrentDate = () => {
      const now = new Date();
      const nextDate = getLocalDateKey(now, DEFAULT_RESTAURANT_TIME_ZONE);
      const nextTime = getLocalTimeKey(now, DEFAULT_RESTAURANT_TIME_ZONE);
      setCurrentDate((current) => current === nextDate ? current : nextDate);
      setCurrentTime((current) => current === nextTime ? current : nextTime);
    };
    const interval = window.setInterval(refreshCurrentDate, 60_000);
    window.addEventListener("focus", refreshCurrentDate);
    document.addEventListener("visibilitychange", refreshCurrentDate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCurrentDate);
      document.removeEventListener("visibilitychange", refreshCurrentDate);
    };
  }, []);

  const saveRestaurant = useCallback(async (updates: RestaurantUpdate) => {
    if (!supabase || !restaurant) throw new Error("Ristorante non disponibile.");
    setSaving(true);
    setError(null);
    try {
      const updatedAt = new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from("restaurants")
        .update({
          name: updates.name,
          address: updates.address,
          phone: updates.phone,
          email: updates.email,
          lunch_open: updates.lunchOpen,
          lunch_close: updates.lunchClose,
          lunch_capacity: updates.lunchCapacity,
          dinner_open: updates.dinnerOpen,
          dinner_close: updates.dinnerClose,
          dinner_capacity: updates.dinnerCapacity,
          updated_at: updatedAt,
        })
        .eq("id", restaurant.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      const savedRestaurant = mapRestaurant(data as DatabaseRestaurant);
      setRestaurant(savedRestaurant);
      return savedRestaurant;
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Errore durante il salvataggio del ristorante.");
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [restaurant]);

  const addReservation = useCallback(async (reservation: NewReservation) => {
    if (!supabase || !restaurant) throw new Error("Ristorante non disponibile.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("reservations")
        .insert({
          restaurant_id: restaurant.id,
          customer_name: reservation.name,
          phone: reservation.phone,
          date: reservation.date,
          time: reservation.time,
          guests: reservation.guests,
          service: reservation.service,
          source: reservation.source,
          status: reservation.status,
          notes: reservation.note,
          table_name: reservation.table,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;
      const savedReservation = mapReservation(data as DatabaseReservation);
      setReservations((current) => sortReservations([...current, savedReservation]));
      return savedReservation;
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Errore durante il salvataggio della prenotazione.");
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [restaurant]);

  const updateReservationStatus = useCallback(async (id: string, status: Reservation["status"]) => {
    if (!supabase || !restaurant) throw new Error("Ristorante non disponibile.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase
        .from("reservations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("restaurant_id", restaurant.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      const savedReservation = mapReservation(data as DatabaseReservation);
      setReservations((current) => current.map((item) => item.id === id ? savedReservation : item));
      return savedReservation;
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Errore durante l'aggiornamento della prenotazione.");
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [restaurant]);

  const addStaff = useCallback(async (person: StaffInput) => {
    if (!supabase || !restaurant) throw new Error("Ristorante non disponibile.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase.from("staff").insert({
        restaurant_id: restaurant.id,
        name: person.name,
        role: person.role,
        area: person.area,
        phone: person.phone,
        email: person.email,
        status: person.status,
      }).select("*").single();
      if (insertError) throw insertError;
      const savedPerson = mapStaff(data as DatabaseStaff);
      setStaff((current) => [...current, savedPerson].sort((a, b) => a.name.localeCompare(b.name)));
      return savedPerson;
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Errore durante il salvataggio del membro del personale.");
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [restaurant]);

  const updateStaff = useCallback(async (id: string, person: StaffInput) => {
    if (!supabase || !restaurant) throw new Error("Ristorante non disponibile.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase.from("staff").update({
        name: person.name,
        role: person.role,
        area: person.area,
        phone: person.phone,
        email: person.email,
        status: person.status,
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("restaurant_id", restaurant.id).select("*").single();
      if (updateError) throw updateError;
      const savedPerson = mapStaff(data as DatabaseStaff);
      setStaff((current) => current.map((item) => item.id === id ? savedPerson : item).sort((a, b) => a.name.localeCompare(b.name)));
      return savedPerson;
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Errore durante l'aggiornamento del personale.");
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [restaurant]);

  const addShift = useCallback(async (shift: ShiftInput) => {
    if (!supabase || !restaurant) throw new Error("Ristorante non disponibile.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase.from("shifts").insert({
        restaurant_id: restaurant.id,
        staff_id: shift.staffId,
        date: shift.date,
        start_time: shift.status === "rest" ? null : shift.startTime,
        end_time: shift.status === "rest" ? null : shift.endTime,
        area: shift.area,
        status: shift.status,
        notes: shift.notes,
      }).select("*").single();
      if (insertError) throw insertError;
      const savedShift = mapShift(data as DatabaseShift);
      setShifts((current) => sortShifts([...current, savedShift]));
      return savedShift;
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Errore durante il salvataggio del turno.");
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [restaurant]);

  const updateShift = useCallback(async (id: string, shift: ShiftInput) => {
    if (!supabase || !restaurant) throw new Error("Ristorante non disponibile.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: updateError } = await supabase.from("shifts").update({
        staff_id: shift.staffId,
        date: shift.date,
        start_time: shift.status === "rest" ? null : shift.startTime,
        end_time: shift.status === "rest" ? null : shift.endTime,
        area: shift.area,
        status: shift.status,
        notes: shift.notes,
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("restaurant_id", restaurant.id).select("*").single();
      if (updateError) throw updateError;
      const savedShift = mapShift(data as DatabaseShift);
      setShifts((current) => sortShifts(current.map((item) => item.id === id ? savedShift : item)));
      return savedShift;
    } catch (caughtError) {
      const message = getErrorMessage(caughtError, "Errore durante l'aggiornamento del turno.");
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [restaurant]);

  const value = useMemo(() => {
    const activeReservations = reservationsForDate(reservations, currentDate);
    const lunchCovers = countCovers(activeReservations, "Pranzo");
    const dinnerCovers = countCovers(activeReservations, "Cena");
    const onDutyIds = new Set(shifts.filter((shift) => shiftIncludesDateTime(shift, currentDate, currentTime)).map((shift) => shift.staffId));
    const staffOnDuty = staff.filter((person) => onDutyIds.has(person.id));
    const staffOnDutyByArea = staffOnDuty.reduce<Record<StaffArea, number>>((counts, person) => {
      counts[person.area] += 1;
      return counts;
    }, { Sala: 0, Cucina: 0, Bar: 0, Amministrazione: 0 });

    return {
      currentDate,
      restaurant,
      reservations,
      staff,
      shifts,
      activeReservations,
      lunchCovers,
      dinnerCovers,
      totalCovers: lunchCovers + dinnerCovers,
      staffOnDuty,
      staffOnDutyByArea,
      loading,
      saving,
      error,
      modalOpen,
      setModalOpen,
      reloadData,
      saveRestaurant,
      addReservation,
      updateReservationStatus,
      addStaff,
      updateStaff,
      addShift,
      updateShift,
    };
  }, [currentDate, currentTime, restaurant, reservations, staff, shifts, loading, saving, error, modalOpen, reloadData, saveRestaurant, addReservation, updateReservationStatus, addStaff, updateStaff, addShift, updateShift]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
