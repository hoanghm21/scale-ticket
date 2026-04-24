"use client";

import { useState } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Button } from "../components/ui/Button";
import { EventCard } from "../components/event/EventCard";
import { mockEvents } from "@/lib/mock";
import { Search, Sparkles, Filter } from "lucide-react";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = ["All", "Concerts", "Sports", "Arts & Theater"];

  const filteredEvents = mockEvents.filter(e => {
    const matchesCategory = activeCategory === "All" || e.category === activeCategory;
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.venue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Navbar />

      <main className="min-h-screen flex flex-col pb-32">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center justify-center text-center px-4 sm:px-6">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-950 via-indigo-950 to-purple-950/80 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_50%)] pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />

          <div className="relative z-10 inline-flex items-center space-x-2 border border-indigo-500 text-indigo-400 px-4 py-2 font-bold text-xs uppercase tracking-widest mb-8 animate-fade-in shadow-lg shadow-indigo-600/10">
            <Sparkles className="w-4 h-4" />
            <span>The future of live events</span>
          </div>

          <h1 className="relative z-10 text-5xl md:text-7xl font-display font-black tracking-tighter uppercase max-w-4xl mx-auto mb-6 animate-slide-up text-white">
            Real-time Ticketing <br />
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Without the Chaos</span>
          </h1>

          <p className="relative z-10 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-in delay-150">
            Secure your seats instantly with interactive maps, transparent pricing, and lightning-fast checkout. 
            No more waiting in virtual queues.
          </p>

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 animate-slide-up delay-300 w-full max-w-2xl">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search artists, events, or venues..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-dark border border-gray-700 focus:border-indigo-500 rounded-full py-4 pl-12 pr-4 text-white outline-none transition-all shadow-xl shadow-black/20 focus:shadow-indigo-600/10"
              />
            </div>
            <Button size="lg" className="w-full sm:w-auto rounded-full py-4 px-8 text-base shrink-0" onClick={() => {
              document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
            }}>
              Find Tickets
            </Button>
          </div>
        </section>

        {/* Trending Events Section */}
        <section id="events" className="py-20 bg-surface-dark-secondary relative z-10 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
          <div className="max-w-7xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <h2 className="text-3xl font-display font-bold text-white mb-2">Trending Near You</h2>
                <p className="text-gray-400">The hottest events happening this week.</p>
              </div>
              
              {/* Category Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500 mr-2" />
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                      activeCategory === cat 
                        ? "bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-sky-500/20" 
                        : "bg-surface-dark border border-gray-700 text-gray-400 hover:border-indigo-500/40 hover:text-white hover:shadow-md hover:shadow-indigo-600/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">No events found matching your criteria.</p>
              </div>
            )}

          </div>
        </section>

      </main>
    </>
  );
}
