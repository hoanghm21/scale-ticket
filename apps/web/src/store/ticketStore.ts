import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TicketRecord {
  id: string; // Order ID or Ticket ID
  userId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  eventImage: string;
  seats: {
    id: string;
    section: string;
    row: number;
    col: number;
    price: number;
  }[];
  totalPrice: number;
  purchaseDate: number;
}

interface TicketState {
  tickets: TicketRecord[];
  addTicket: (ticket: TicketRecord) => void;
  getUserTickets: (userId: string) => TicketRecord[];
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      addTicket: (ticket) => set((state) => ({ tickets: [ticket, ...state.tickets] })),
      getUserTickets: (userId) => get().tickets.filter((t) => t.userId === userId),
    }),
    {
      name: "scaleticket-tickets",
    }
  )
);
