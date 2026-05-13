"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { EventCardHorizontal } from "@/components/event/EventCardHorizontal";
import { fetchEvents } from "@/lib/api";
import type { MockEvent } from "@/lib/mock";
import { Search, MapPin } from "lucide-react";

export default function SportsPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [locationQuery, setLocationQuery] = useState<string>("");
  const [events, setEvents] = useState<MockEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .then(data => {
        // Filter strictly by Sports category
        setEvents(data.filter(e => e.category === "Sports"));
      })
      .catch(() => setEvents([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = e.venue.toLowerCase().includes(locationQuery.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  return (
    <>
      <Navbar />

      <main className="min-h-screen flex flex-col pb-32 bg-surface-dark-secondary">
        {/* Header Section */}
        <section className="relative pt-32 pb-16 overflow-hidden border-b border-gray-800">
          <div className="absolute inset-0 bg-gradient-to-br from-green-950 via-emerald-900 to-black/80 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_50%)] pointer-events-none" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter uppercase mb-4 text-white">
              Live <span className="text-emerald-400">Sports</span>
            </h1>
            <p className="text-gray-300 max-w-2xl mx-auto mb-8 text-lg">
              Feel the adrenaline. Get tickets to the biggest matches, tournaments, and athletic events near you.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-3xl mx-auto">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search sports events or teams..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-dark border border-gray-700 focus:border-emerald-500 rounded-xl py-3 pl-12 pr-4 text-white outline-none transition-all shadow-xl shadow-black/20"
                />
              </div>
              <div className="relative w-full sm:w-64 shrink-0">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Location / Venue" 
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full bg-surface-dark border border-gray-700 focus:border-emerald-500 rounded-xl py-3 pl-12 pr-4 text-white outline-none transition-all shadow-xl shadow-black/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Events List */}
        <section className="py-12 relative z-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {isLoading ? (
              <div className="flex flex-col gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col md:flex-row bg-surface-dark border border-gray-800 h-64 overflow-hidden animate-pulse">
                    <div className="w-full md:w-1/3 bg-gray-800 h-full" />
                    <div className="flex-1 p-8 space-y-4">
                      <div className="h-6 w-3/4 bg-gray-800 rounded" />
                      <div className="h-4 w-full bg-gray-800 rounded" />
                      <div className="h-4 w-5/6 bg-gray-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-6">
                  {filteredEvents.map((event) => (
                    <EventCardHorizontal key={event.id} event={event} />
                  ))}
                </div>

                {filteredEvents.length === 0 && (
                  <div className="text-center py-20 bg-surface-dark border border-gray-800 mt-8">
                    <p className="text-gray-400 text-lg">No sports events found matching your criteria.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
