"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { QrCode, Calendar, MapPin, Clock, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useTicketStore } from "@/store/ticketStore";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const getTickets = useTicketStore(state => state.getUserTickets);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-10">
          <h1 className="text-4xl font-display font-extrabold text-white mb-2">Welcome Back, {user?.firstName}</h1>
          <p className="text-gray-400">Manage your tickets and upcoming events.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-xl font-bold text-white mb-4">Upcoming Events ({user ? getTickets(user.id).length : 0})</h2>
            
            {(!user || getTickets(user.id).length === 0) ? (
              <div className="bg-surface-dark-secondary rounded-2xl p-8 border border-gray-800 text-center text-gray-500">
                <p>You haven&apos;t purchased any tickets yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {getTickets(user.id).map(ticket => (
                  <div key={ticket.id} className="relative w-full overflow-hidden bg-[#0A0A0A] border border-gray-800 transition-all hover:border-indigo-500/50 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)] group">
                    <div className="flex flex-col sm:flex-row">
                      
                      {/* Image Section */}
                      <div className="relative w-full sm:w-64 h-48 sm:h-auto shrink-0">
                        <Image 
                          src={ticket.eventImage || "/images/symphony_stars.png"}
                          alt={ticket.eventTitle}
                          fill
                          className="object-cover"
                        />
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/80 to-transparent" />
                        <div className="absolute top-4 left-4">
                          <span className="bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                            Standard Entry
                          </span>
                        </div>
                      </div>

                      {/* Details Section */}
                      <div className="flex-1 p-6 relative">
                        <h3 className="text-2xl font-bold text-white mb-1">{ticket.eventTitle}</h3>
                        <p className="text-sm text-indigo-400 font-medium mb-4">{ticket.eventVenue}</p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Date / Time</p>
                            <p className="text-sm text-white font-medium flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1" /> {ticket.eventDate}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-black/20 rounded-xl p-3 border border-gray-800">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Section</p>
                            <p className="text-sm text-white font-bold truncate pr-2">{ticket.seats[0]?.section || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Seats</p>
                            <p className="text-sm text-white font-bold">{ticket.seats.length} Ticket(s)</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Total</p>
                            <p className="text-sm text-white font-bold">${ticket.totalPrice.toFixed(2)}</p>
                          </div>
                        </div>
                        
                        {/* Decorative dashed cut line */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-dark hidden sm:block border-r border-gray-800 z-10" />
                      </div>

                      {/* QR Section */}
                      <div className="w-full sm:w-48 bg-gray-900 border-t sm:border-t-0 sm:border-l border-gray-800 p-6 flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Scan to Enter</p>
                        <div className="bg-white p-2 rounded-xl mb-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500">
                          <QrCode className="w-20 h-20 text-black" strokeWidth={1.5} />
                        </div>
                        <p className="text-[10px] text-gray-600 tracking-widest font-mono">{ticket.id.substring(0, 12).toUpperCase()}</p>
                        
                        {/* Decorative dashed cut line */}
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-dark hidden sm:block border-l border-gray-800 z-10" />
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-8">
              <h2 className="text-xl font-bold text-white mb-4">Past Events</h2>
              <div className="bg-surface-dark-secondary rounded-2xl p-8 border border-gray-800 text-center text-gray-500">
                <p>No past events to show.</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#0A0A0A] p-6 border border-gray-800">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-gray-400 text-sm">Member since 2024</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-3 bg-white/5 rounded-xl text-white font-medium hover:bg-white/10 transition-colors flex justify-between items-center">
                  Payment Methods <ArrowRight className="w-4 h-4 text-gray-500" />
                </button>
                <button className="w-full text-left px-4 py-3 bg-transparent rounded-xl text-gray-400 font-medium hover:bg-white/5 hover:text-white transition-colors flex justify-between items-center">
                  Account Settings <ArrowRight className="w-4 h-4 text-gray-500" />
                </button>
                <button className="w-full text-left px-4 py-3 bg-transparent rounded-xl text-gray-400 font-medium hover:bg-white/5 hover:text-white transition-colors flex justify-between items-center">
                  Support <ArrowRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
