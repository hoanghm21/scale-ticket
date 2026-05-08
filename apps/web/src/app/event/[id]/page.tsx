"use client";

import React, { useState } from "react";
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { mockEvents } from "@/lib/mock";
import { Calendar, MapPin, Clock, Info } from "lucide-react";

export default function EventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const event = mockEvents.find((e) => e.id === params.id);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (!event) return notFound();

  // Generate fake varied dates
  const fakeDates = [
    { id: "d1", date: event.date, status: "Selling Fast" },
    { id: "d2", date: "Tomorrow • 8:00 PM", status: "Available" },
    { id: "d3", date: "Saturday • 7:00 PM", status: "Available" },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-40">
        
        {/* Full-bleed Hero Container */}
        <section className="relative w-full h-[50vh] min-h-[400px]">
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/80 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <span className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/50 text-indigo-400 rounded-full text-xs font-bold mb-4 uppercase tracking-wider backdrop-blur-md">
              {event.category}
            </span>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold text-white mb-4 leading-tight shadow-black drop-shadow-lg">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-6 text-gray-300">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-indigo-400" />
                <span className="text-lg">{event.venue}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Details & Dates Selection */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-white mb-4">About This Event</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Experience the magic of {event.title} live at the {event.venue}. Get ready for a breathtaking performance spanning two hours of incredible entertainment, stunning visuals, and unforgettable moments. Secure your spot now before it&apos;s sold out.
              </p>

              <div className="bg-surface-dark-secondary rounded-2xl p-6 border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-indigo-400" /> Need to Know
                </h3>
                <ul className="space-y-3 text-gray-400">
                  <li>• Doors open 1.5 hours prior to the event start time.</li>
                  <li>• All ticket sales are final without ticket protection plan.</li>
                  <li>• Venue policies apply for bags and security checks.</li>
                </ul>
              </div>
            </div>

            <div className="bg-surface-dark-secondary rounded-2xl p-6 border border-gray-800 h-fit">
              <h3 className="text-xl font-bold text-white mb-6">Select a Date</h3>
              
              <div className="space-y-4 mb-8">
                {fakeDates.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDate(d.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedDate === d.id 
                        ? "border-indigo-500 bg-indigo-500/10" 
                        : "border-gray-700 bg-surface-dark hover:border-gray-500"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center text-white font-medium">
                        <Calendar className="w-4 h-4 mr-2" />
                        {d.date.split("•")[0]}
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-sm uppercase ${
                        d.status === "Selling Fast" ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500"
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-400 text-sm pl-6">
                      <Clock className="w-3.5 h-3.5 mr-2" />
                      {d.date.split("•")[1] || "TBA"}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Tickets from</p>
                  <p className="text-2xl font-bold text-white">${event.priceStart}</p>
                </div>
                <Button 
                  size="lg" 
                  disabled={!selectedDate}
                  onClick={() => router.push(`/event/${event.id}/map`)}
                >
                  Find Seats
                </Button>
              </div>
            </div>

          </div>
        </section>

      </main>
    </>
  );
}
