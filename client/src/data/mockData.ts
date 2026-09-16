import type { Reservation, StaffMember, StaffSchedule } from "@/types/models";

export const TODAY = "2026-09-16";

export const initialReservations: Reservation[] = [
  { id: "r1", date: TODAY, time: "12:30", name: "Marco Rinaldi", phone: "+39 333 214 8890", guests: 2, source: "Telefono", status: "confirmed", note: "Allergia al glutine", table: "Tavolo 2", service: "Pranzo" },
  { id: "r2", date: TODAY, time: "13:00", name: "Giulia Bianchi", phone: "+39 347 663 1082", guests: 4, source: "Sito", status: "confirmed", note: "Tavolo vista giardino", table: "Tavolo 5", service: "Pranzo" },
  { id: "r3", date: TODAY, time: "13:00", name: "Luca Ferrari", phone: "+39 329 830 5571", guests: 6, source: "WhatsApp", status: "pending", note: "Occasione speciale", table: "Tavolo 8", service: "Pranzo" },
  { id: "r4", date: TODAY, time: "13:30", name: "Anna Verdi", phone: "+39 320 118 0245", guests: 2, source: "Telefono", status: "confirmed", note: "", table: "Tavolo 3", service: "Pranzo" },
  { id: "r5", date: TODAY, time: "13:30", name: "Elisa Sala", phone: "+39 333 612 2391", guests: 6, source: "Sito", status: "confirmed", note: "Seggiolone", table: "Tavolo 7", service: "Pranzo" },
  { id: "r6", date: TODAY, time: "14:00", name: "Matteo Neri", phone: "+39 340 922 1264", guests: 4, source: "Telefono", status: "confirmed", note: "", table: "Tavolo 4", service: "Pranzo" },
  { id: "r7", date: TODAY, time: "14:00", name: "Chiara Costa", phone: "+39 331 442 7280", guests: 4, source: "Walk-in", status: "completed", note: "", table: "Tavolo 6", service: "Pranzo" },
  { id: "r8", date: TODAY, time: "14:30", name: "Andrea Vitale", phone: "+39 345 864 3712", guests: 4, source: "Sito", status: "confirmed", note: "", table: "Tavolo 9", service: "Pranzo" },
  { id: "r9", date: TODAY, time: "19:30", name: "Paolo Rossi", phone: "+39 333 123 4567", guests: 4, source: "Sito", status: "confirmed", note: "", table: "Tavolo 6", service: "Cena" },
  { id: "r10", date: TODAY, time: "20:00", name: "Elena Bianchi", phone: "+39 348 556 9081", guests: 2, source: "Telefono", status: "pending", note: "Richiesta tavolo tranquillo", table: "Tavolo 3", service: "Cena" },
  { id: "r11", date: TODAY, time: "20:00", name: "Davide Conti", phone: "+39 329 124 7860", guests: 6, source: "WhatsApp", status: "confirmed", note: "Compleanno", table: "Tavolo 1", service: "Cena" },
  { id: "r12", date: TODAY, time: "20:30", name: "Martina Galli", phone: "+39 320 711 3489", guests: 4, source: "Walk-in", status: "confirmed", note: "", table: "Tavolo 7", service: "Cena" },
  { id: "r13", date: TODAY, time: "21:00", name: "Alessandro Russo", phone: "+39 339 186 4402", guests: 2, source: "Telefono", status: "confirmed", note: "", table: "Tavolo 9", service: "Cena" },
  { id: "r14", date: TODAY, time: "21:30", name: "Francesca Greco", phone: "+39 347 502 6188", guests: 5, source: "Sito", status: "cancelled", note: "", table: "Tavolo 10", service: "Cena" },
  { id: "r15", date: TODAY, time: "21:30", name: "Giovanni Esposito", phone: "+39 333 642 8001", guests: 5, source: "WhatsApp", status: "confirmed", note: "Intolleranza al lattosio", table: "Tavolo 5", service: "Cena" },
  { id: "r16", date: TODAY, time: "22:00", name: "Sara Moretti", phone: "+39 320 908 3544", guests: 6, source: "Sito", status: "confirmed", note: "", table: "Tavolo 4", service: "Cena" },
  { id: "r17", date: TODAY, time: "22:00", name: "Roberto Lombardi", phone: "+39 348 771 6290", guests: 4, source: "Telefono", status: "confirmed", note: "", table: "Tavolo 8", service: "Cena" },
  { id: "r18", date: TODAY, time: "22:30", name: "Laura Mancini", phone: "+39 331 450 9812", guests: 8, source: "Sito", status: "confirmed", note: "Festa di laurea", table: "Tavolo 11", service: "Cena" },
];

export const staffMembers: StaffMember[] = [
  { id: "s1", name: "Marco Bianchi", role: "Cameriere", area: "Sala", status: "working", shift: "10:00 – 18:00", initials: "MB", accent: "#d89a67" },
  { id: "s2", name: "Giulia Rossi", role: "Cameriera", area: "Sala", status: "working", shift: "16:00 – 24:00", initials: "GR", accent: "#b56b55" },
  { id: "s3", name: "Luca Ferri", role: "Chef", area: "Cucina", status: "working", shift: "10:00 – 23:00", initials: "LF", accent: "#cab18b" },
  { id: "s4", name: "Anna Verdi", role: "Responsabile sala", area: "Sala", status: "upcoming", shift: "12:00 – 22:00", initials: "AV", accent: "#8f6b51" },
  { id: "s5", name: "Davide Conti", role: "Cuoco", area: "Cucina", status: "absent", shift: "Domani 10:00", initials: "DC", accent: "#6e8b7d" },
  { id: "s6", name: "Sara Moretti", role: "Bar manager", area: "Bar", status: "working", shift: "16:00 – 24:00", initials: "SM", accent: "#85665d" },
];

export const schedules: StaffSchedule[] = [
  { staffId: "s1", shifts: [{ label: "10–18", type: "sala" }, { label: "Riposo", type: "riposo" }, { label: "10–24", type: "sala" }, { label: "10–24", type: "sala" }, { label: "10–24", type: "sala" }, { label: "10–18", type: "sala" }, { label: "Riposo", type: "riposo" }] },
  { staffId: "s2", shifts: [{ label: "10–24", type: "sala" }, { label: "16–24", type: "sala" }, { label: "16–06", type: "riposo" }, { label: "10–24", type: "sala" }, { label: "10–24", type: "sala" }, { label: "10–24", type: "sala" }, { label: "10–24", type: "sala" }] },
  { staffId: "s3", shifts: [{ label: "10–23", type: "cucina" }, { label: "10–24", type: "cucina" }, { label: "10–24", type: "cucina" }, { label: "Riposo", type: "riposo" }, { label: "Riposo", type: "riposo" }, { label: "10–23", type: "cucina" }, { label: "16–24", type: "cucina" }] },
  { staffId: "s4", shifts: [{ label: "12–22", type: "bar" }, { label: "10–24", type: "bar" }, { label: "12–22", type: "bar" }, { label: "Riposo", type: "riposo" }, { label: "12–22", type: "bar" }, { label: "Riposo", type: "riposo" }, { label: "13–22", type: "bar" }] },
  { staffId: "s5", shifts: [{ label: "12–22", type: "bar" }, { label: "Riposo", type: "riposo" }, { label: "Riposo", type: "riposo" }, { label: "12–22", type: "bar" }, { label: "10–24", type: "sala" }, { label: "10–24", type: "cucina" }, { label: "Riposo", type: "riposo" }] },
  { staffId: "s6", shifts: [{ label: "Riposo", type: "riposo" }, { label: "10–24", type: "sala" }, { label: "10–24", type: "sala" }, { label: "10–26", type: "sala" }, { label: "Riposo", type: "riposo" }, { label: "Riposo", type: "riposo" }, { label: "Riposo", type: "riposo" }] },
];

export const occupancyHours = [
  { time: "12:00", value: 8 }, { time: "12:30", value: 12 }, { time: "13:00", value: 20 },
  { time: "13:30", value: 18 }, { time: "14:00", value: 10 }, { time: "19:00", value: 16 },
  { time: "19:30", value: 24 }, { time: "20:00", value: 32 }, { time: "20:30", value: 36 },
  { time: "21:00", value: 31 }, { time: "21:30", value: 22 }, { time: "22:00", value: 14 },
];
