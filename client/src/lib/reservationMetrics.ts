import type { Reservation, ServiceType } from "@/types/models";

export type CoversPoint = {
  key: string;
  label: string;
  value: number;
};

export function isActiveReservation(reservation: Reservation) {
  return reservation.status !== "cancelled";
}

export function reservationsForDate(reservations: Reservation[], date: string, includeCancelled = false) {
  return reservations.filter((reservation) => reservation.date === date && (includeCancelled || isActiveReservation(reservation)));
}

export function reservationsForDates(reservations: Reservation[], dates: string[]) {
  const allowedDates = new Set(dates);
  return reservations.filter((reservation) => allowedDates.has(reservation.date) && isActiveReservation(reservation));
}

export function countCovers(reservations: Reservation[], service?: ServiceType) {
  return reservations
    .filter((reservation) => !service || reservation.service === service)
    .reduce((total, reservation) => total + reservation.guests, 0);
}

export function coversByTime(reservations: Reservation[]): CoversPoint[] {
  const totals = new Map<string, number>();
  reservations.filter(isActiveReservation).forEach((reservation) => {
    totals.set(reservation.time, (totals.get(reservation.time) ?? 0) + reservation.guests);
  });
  return Array.from(totals.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([time, value]) => ({ key: time, label: time, value }));
}

export function coversByDate(reservations: Reservation[], dates: string[], labelForDate: (date: string) => string): CoversPoint[] {
  const active = reservations.filter(isActiveReservation);
  return dates.map((date) => ({
    key: date,
    label: labelForDate(date),
    value: active.filter((reservation) => reservation.date === date).reduce((total, reservation) => total + reservation.guests, 0),
  }));
}

export function occupancyTone(percent: number) {
  if (percent >= 85) return "red";
  if (percent >= 65) return "gold";
  return "green";
}
