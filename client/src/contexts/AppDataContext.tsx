import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { TODAY } from "@/data/mockData";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { NewReservation, Reservation, Restaurant, RestaurantUpdate } from "@/types/models";

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

interface AppDataContextValue {
  restaurant: Restaurant | null;
  reservations: Reservation[];
  activeReservations: Reservation[];
  lunchCovers: number;
  dinnerCovers: number;
  totalCovers: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  reloadData: () => Promise<void>;
  saveRestaurant: (restaurant: RestaurantUpdate) => Promise<Restaurant>;
  addReservation: (reservation: NewReservation) => Promise<Reservation>;
  updateReservationStatus: (id: string, status: Reservation["status"]) => Promise<Reservation>;
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

function sortReservations(items: Reservation[]) {
  return [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
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
      const { data: reservationRows, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .eq("restaurant_id", currentRestaurant.id)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (reservationsError) throw reservationsError;
      setRestaurant(currentRestaurant);
      setReservations(sortReservations((reservationRows ?? []).map((row) => mapReservation(row as DatabaseReservation))));
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "Errore durante il caricamento dei dati."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadData();
  }, [reloadData]);

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

  const value = useMemo(() => {
    const activeReservations = reservations.filter((item) => item.date === TODAY && item.status !== "cancelled");
    const lunchCovers = activeReservations.filter((item) => item.service === "Pranzo").reduce((sum, item) => sum + item.guests, 0);
    const dinnerCovers = activeReservations.filter((item) => item.service === "Cena").reduce((sum, item) => sum + item.guests, 0);

    return {
      restaurant,
      reservations,
      activeReservations,
      lunchCovers,
      dinnerCovers,
      totalCovers: lunchCovers + dinnerCovers,
      loading,
      saving,
      error,
      modalOpen,
      setModalOpen,
      reloadData,
      saveRestaurant,
      addReservation,
      updateReservationStatus,
    };
  }, [restaurant, reservations, loading, saving, error, modalOpen, reloadData, saveRestaurant, addReservation, updateReservationStatus]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
