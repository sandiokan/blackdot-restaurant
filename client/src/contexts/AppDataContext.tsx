import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { initialReservations, TODAY } from "@/data/mockData";
import type { Reservation } from "@/types/models";

interface AppDataContextValue {
  reservations: Reservation[];
  activeReservations: Reservation[];
  lunchCovers: number;
  dinnerCovers: number;
  totalCovers: number;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  addReservation: (reservation: Omit<Reservation, "id">) => void;
  updateReservationStatus: (id: string, status: Reservation["status"]) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [modalOpen, setModalOpen] = useState(false);

  const value = useMemo(() => {
    const activeReservations = reservations.filter((item) => item.date === TODAY && item.status !== "cancelled");
    const lunchCovers = activeReservations.filter((item) => item.service === "Pranzo").reduce((sum, item) => sum + item.guests, 0);
    const dinnerCovers = activeReservations.filter((item) => item.service === "Cena").reduce((sum, item) => sum + item.guests, 0);

    return {
      reservations,
      activeReservations,
      lunchCovers,
      dinnerCovers,
      totalCovers: lunchCovers + dinnerCovers,
      modalOpen,
      setModalOpen,
      addReservation: (reservation: Omit<Reservation, "id">) => {
        setReservations((current) => [...current, { ...reservation, id: `r${Date.now()}` }]);
      },
      updateReservationStatus: (id: string, status: Reservation["status"]) => {
        setReservations((current) => current.map((item) => item.id === id ? { ...item, status } : item));
      },
    };
  }, [reservations, modalOpen]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
