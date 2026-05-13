"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { fetchEventById } from "@/lib/api";
import type { MockEvent } from "@/lib/mock";
import { SeatMap, Seat } from "@/components/event/SeatMap";
import { Calendar, MapPin, ChevronLeft, CheckCircle2, Ticket } from "lucide-react";
import { useCartStore } from "@/store/cartStore";

export default function EventMapPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<MockEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  
  const cartStore = useCartStore();
  const selectedSeats = cartStore.eventId === params.id ? cartStore.items : [];

  useEffect(() => {
    fetchEventById(params.id)
      .then((e) => {
        setEvent(e);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [params.id]);

  if (!isLoading && !event) return notFound();

  if (isLoading || !event) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </main>
      </>
    );
  }

  const handleSelectionChange = (mapSeats: Seat[]) => {
    // Only dispatch if lengths mismatch to prevent infinite Zustand cycles
    if (mapSeats.length !== selectedSeats.length) {
      cartStore.setSeats(mapSeats.map(s => ({ ...s, eventId: params.id, id: s.id })), params.id);
    } else {
      let isDiff = false;
      for (const s of mapSeats) {
        if (!selectedSeats.find(c => c.id === s.id)) { isDiff = true; break;}
      }
      if (isDiff) {
        cartStore.setSeats(mapSeats.map(s => ({ ...s, eventId: params.id, id: s.id })), params.id);
      }
    }
  };

  const totalPrice = cartStore.eventId === params.id ? cartStore.getTotal() : 0;

  const handleCheckout = () => {
    setIsChecking(true);
    // Simulate API availability check
    setTimeout(() => {
      // Pass selected seats configuration in query params or global state in a real app
      router.push("/checkout");
    }, 1500);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 flex flex-col lg:flex-row bg-surface-dark overflow-hidden">
        
        {/* Left Side: Seat Map */}
        <div className="flex-1 relative h-[60vh] lg:h-[calc(100vh-80px)] border-r border-gray-800 flex flex-col">
          {/* Header Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-surface-dark/80 backdrop-blur-md border-b border-gray-800 z-10 flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              className="flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Event
            </button>
            <div className="text-right">
              <h2 className="text-white font-bold">{event.title}</h2>
              <p className="text-xs text-indigo-400">{event.venue}</p>
            </div>
          </div>
          
          <div className="flex-1 w-full bg-[#1A1D24]">
            <SeatMap 
              onSelectionChange={handleSelectionChange} 
              basePrice={event.priceStart} 
              layoutType={
                event.category === "Sports" ? "stadium" : 
                event.category === "Arts & Theater" ? "theater" : "arena"
              }
              selectedSeatIdsProp={selectedSeats.map(s => s.id)}
              eventId={params.id}
            />
          </div>
        </div>

        {/* Right Side: Selection Panel */}
        <div className="w-full lg:w-96 bg-surface-dark-secondary flex flex-col h-[40vh] lg:h-[calc(100vh-80px)] shrink-0 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-20">
          
          <div className="p-6 border-b border-gray-800 shrink-0">
            <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 relative shadow-lg">
              <Image src={event.image} alt={event.title} fill className="object-cover" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 leading-tight">{event.title}</h3>
            <div className="flex items-center text-gray-400 text-sm mb-1">
              <Calendar className="w-3.5 h-3.5 mr-2" />
              Selected Date
            </div>
          </div>

          {/* Selected Seats Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-white flex items-center">
                <Ticket className="w-4 h-4 mr-2 text-indigo-400" />
                Your Seats
              </h4>
              <span className="text-xs font-semibold bg-gray-800 text-gray-300 px-2 py-1 rounded">
                {selectedSeats.length} Selected
              </span>
            </div>

            {selectedSeats.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                <Ticket className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Click on the map to select seats</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedSeats.map((seat) => (
                  <div key={seat.id} className="bg-surface-dark border border-gray-700/50 rounded-xl p-4 flex justify-between items-center animate-fade-in group hover:border-indigo-500/50 transition-colors">
                    <div>
                      <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">{seat.section}</p>
                      <p className="text-white font-medium text-sm">Row {seat.row + 1}, Seat {(seat.col % 20) + 1}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">${seat.price}</p>
                      {seat.section.toLowerCase().includes("vip") && (
                        <p className="text-[10px] text-amber-400 flex items-center mt-0.5">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> VIP
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Checkout Bottom */}
          <div className="p-6 border-t border-gray-800 bg-surface-dark-secondary shrink-0">
            <div className="flex justify-between items-end mb-6">
              <span className="text-gray-400 text-sm">Total Price</span>
              <span className="text-3xl font-display font-bold text-white">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="px-4"
                disabled={selectedSeats.length === 0 || isChecking}
                onClick={() => cartStore.clearCart()}
              >
                Clear
              </Button>
              <Button 
                variant="primary" 
                className="flex-1 relative overflow-hidden"
                disabled={selectedSeats.length === 0 || isChecking}
                onClick={handleCheckout}
              >
                {isChecking ? (
                  <span className="flex items-center justify-center text-white font-bold opacity-80">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Locking Seats...
                  </span>
                ) : (
                  <span className="text-white font-bold">Continue to Checkout</span>
                )}
              </Button>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
