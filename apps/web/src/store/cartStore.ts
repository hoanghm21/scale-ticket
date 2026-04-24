import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string; // the seat ID assigned
  section: string;
  row: number;
  col: number;
  price: number;
  eventId: string | null;
}

interface CartState {
  items: CartItem[];
  eventId: string | null;
  addSeat: (item: CartItem) => void;
  setSeats: (items: CartItem[], eventId: string) => void;
  removeSeat: (seatId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      eventId: null,

      addSeat: (item) => set((state) => {
        // If adding a seat to a different event, clear the previous cart
        if (state.eventId && state.eventId !== item.eventId) {
          return { items: [item], eventId: item.eventId };
        }
        
        // Prevent duplicates
        if (state.items.find(i => i.id === item.id)) {
          return state;
        }
        
        return { items: [...state.items, item], eventId: item.eventId };
      }),

      setSeats: (items, eventId) => set({ items, eventId }),

      removeSeat: (seatId) => set((state) => {
        const nextItems = state.items.filter(i => i.id !== seatId);
        return {
          items: nextItems,
          eventId: nextItems.length === 0 ? null : state.eventId
        };
      }),

      clearCart: () => set({ items: [], eventId: null }),

      getTotal: () => get().items.reduce((total, item) => total + item.price, 0)
    }),
    {
      name: "scaleticket-cart",
    }
  )
);
