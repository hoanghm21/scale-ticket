"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getEvents, createEvent } from "@/lib/api";
import { Calendar, MapPin, Plus, Edit, LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EventsPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "Concerts",
    venue: "",
    date: "",
    image: "/images/neon_concert.png",
    priceStart: 0,
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    } else if (mounted && isAuthenticated) {
      fetchEvents();
    }
  }, [mounted, isAuthenticated, router]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const data = await getEvents();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await createEvent(formData);
      setIsModalOpen(false);
      setFormData({
        title: "",
        category: "Concerts",
        venue: "",
        date: "",
        image: "/images/neon_concert.png",
        priceStart: 0,
      });
      fetchEvents(); // Refresh list
    } catch (err) {
      console.error("Failed to create event:", err);
      alert("Failed to create event. See console for details.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[#0A0A0A] border-b border-[#333] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-[#DFFF00] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Event Management</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#DFFF00] text-black px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-sm hover:bg-[#c9e600] transition-colors"
          >
            <Plus size={16} /> New Event
          </button>
          <button 
            onClick={() => logout()}
            className="text-red-400 hover:bg-red-500/10 p-2 rounded-md transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="text-center py-20 text-gray-500">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#333] rounded-lg">
            <p className="text-gray-500 mb-4">No events found.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-[#DFFF00] hover:underline"
            >
              Create your first event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-[#111] border border-[#333] rounded-lg overflow-hidden group">
                <div className="h-40 bg-[#222] relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-3 left-3 bg-black/80 px-2 py-1 text-xs text-[#DFFF00] border border-[#DFFF00]/30 rounded">
                    {event.category}
                  </div>
                  <div className="absolute top-3 right-3 bg-black/80 px-2 py-1 text-xs text-white rounded">
                    {event.status}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold truncate mb-2">{event.title}</h3>
                  <div className="space-y-1 text-sm text-gray-400 mb-4">
                    <p className="flex items-center gap-2"><MapPin size={14} /> {event.venue}</p>
                    <p className="flex items-center gap-2"><Calendar size={14} /> {event.date}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#333]">
                    <span className="text-[#DFFF00] font-bold">${event.priceStart}</span>
                    <button className="text-gray-400 hover:text-white p-1 rounded transition-colors" title="Edit Event">
                      <Edit size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] border border-[#333] p-6 rounded-lg max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-[#DFFF00]">Create New Event</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Event Title</label>
                <input 
                  type="text" required 
                  className="w-full bg-black border border-[#333] px-3 py-2 outline-none focus:border-[#DFFF00] rounded-sm"
                  value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select 
                    className="w-full bg-black border border-[#333] px-3 py-2 outline-none focus:border-[#DFFF00] rounded-sm"
                    value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option>Concerts</option>
                    <option>Sports</option>
                    <option>Arts & Theater</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Base Price ($)</label>
                  <input 
                    type="number" required min="0"
                    className="w-full bg-black border border-[#333] px-3 py-2 outline-none focus:border-[#DFFF00] rounded-sm"
                    value={formData.priceStart} onChange={(e) => setFormData({...formData, priceStart: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Venue Name</label>
                <input 
                  type="text" required 
                  className="w-full bg-black border border-[#333] px-3 py-2 outline-none focus:border-[#DFFF00] rounded-sm"
                  value={formData.venue} onChange={(e) => setFormData({...formData, venue: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date String (e.g. Oct 24 • 8:00 PM)</label>
                <input 
                  type="text" required 
                  className="w-full bg-black border border-[#333] px-3 py-2 outline-none focus:border-[#DFFF00] rounded-sm"
                  value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-transparent border border-[#333] text-gray-300 py-2 rounded-sm hover:bg-[#222]"
                >
                  Cancel
                </button>
                <button 
                  type="submit" disabled={isCreating}
                  className="flex-1 bg-[#DFFF00] text-black font-bold py-2 rounded-sm hover:bg-[#c9e600] disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
