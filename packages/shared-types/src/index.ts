export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "user" | "organizer" | "admin";
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: Venue;
  startDate: string;
  endDate: string;
}

export interface Venue {
  name: string;
  city: string;
  country: string;
}

export type SeatStatus = "available" | "locked" | "sold";

export interface Seat {
  id: string;
  label: string;
  status: SeatStatus;
}

export * from "./venue";
