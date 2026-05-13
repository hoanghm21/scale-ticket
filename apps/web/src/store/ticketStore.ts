import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TicketRecord {
  id: string; // Order ID or Ticket ID
  ticketCode?: string; // QR code / ticket code
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
  status?: string;
}

interface TicketState {
  tickets: TicketRecord[];
  isLoading: boolean;
  addTicket: (ticket: TicketRecord) => void;
  getUserTickets: (userId: string) => TicketRecord[];
  syncFromAPI: (userId: string, token: string) => Promise<void>;
  createTicketViaAPI: (ticket: Omit<TicketRecord, "id" | "purchaseDate">, token: string) => Promise<TicketRecord | null>;
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      isLoading: false,

      addTicket: (ticket) => set((state) => ({ tickets: [ticket, ...state.tickets] })),

      getUserTickets: (userId) => get().tickets.filter((t) => t.userId === userId),

      // Sync tickets from the Ticket Service API
      syncFromAPI: async (userId: string, token: string) => {
        try {
          set({ isLoading: true });
          const res = await fetch(`/api/tickets?userId=${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            console.warn("Failed to sync tickets from API:", res.status);
            return;
          }

          const data = await res.json();
          const apiTickets: TicketRecord[] = (data.tickets || []).map((t: any) => ({
            id: t.id,
            ticketCode: t.ticketCode,
            userId: t.userId,
            eventId: t.eventId,
            eventTitle: t.eventTitle || "",
            eventDate: t.eventDate || "",
            eventVenue: t.eventVenue || "",
            eventImage: t.eventImage || "",
            seats: t.seats || [],
            totalPrice: t.totalPrice,
            purchaseDate: t.purchaseDate,
            status: t.status,
          }));

          // Merge: keep API tickets, add local-only tickets
          const existing = get().tickets;
          const apiIds = new Set(apiTickets.map((t) => t.id));
          const localOnly = existing.filter((t) => !apiIds.has(t.id));
          set({ tickets: [...apiTickets, ...localOnly] });
        } catch (err) {
          console.warn("Ticket sync failed:", err);
        } finally {
          set({ isLoading: false });
        }
      },

      // Create a ticket via the API and add to local store
      createTicketViaAPI: async (ticket, token) => {
        try {
          const res = await fetch("/api/tickets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(ticket),
          });

          if (!res.ok) {
            console.warn("Failed to create ticket via API:", res.status);
            return null;
          }

          const created: TicketRecord = await res.json();
          created.purchaseDate = created.purchaseDate || Date.now();
          set((state) => ({ tickets: [created, ...state.tickets] }));
          return created;
        } catch (err) {
          console.warn("Ticket creation API failed, saving locally:", err);
          // Fallback: save locally with a generated ID
          const localTicket: TicketRecord = {
            ...ticket,
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            purchaseDate: Date.now(),
          };
          set((state) => ({ tickets: [localTicket, ...state.tickets] }));
          return localTicket;
        }
      },
    }),
    {
      name: "scaleticket-tickets",
    }
  )
);
