import type { StaffMember, StaffSchedule } from "@/types/models";

export const TODAY = "2026-09-16";

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
