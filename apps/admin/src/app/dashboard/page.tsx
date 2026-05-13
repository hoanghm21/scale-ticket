"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getEvents } from "@/lib/api";
import { ArrowLeft, LogOut, TrendingUp, Users, Ticket, DollarSign } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    events: 0,
    ticketsSold: 0,
    revenue: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    } else if (mounted && isAuthenticated) {
      // Fetch mock stats based on events
      getEvents().then((data) => {
        const eventsCount = data.events?.length || 0;
        setStats({
          events: eventsCount,
          ticketsSold: eventsCount * 145, // Mock data
          revenue: eventsCount * 145 * 50, // Mock data
          activeUsers: eventsCount * 120, // Mock data
        });
      }).catch(console.error);
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[#0A0A0A] border-b border-[#333] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-[#DFFF00] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Overview Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
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
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Revenue" value={`$${stats.revenue.toLocaleString()}`} icon={<DollarSign size={24} />} trend="+12%" />
          <StatCard title="Tickets Sold" value={stats.ticketsSold.toLocaleString()} icon={<Ticket size={24} />} trend="+5%" />
          <StatCard title="Active Events" value={stats.events.toString()} icon={<TrendingUp size={24} />} trend="Stable" />
          <StatCard title="Active Users" value={stats.activeUsers.toLocaleString()} icon={<Users size={24} />} trend="+18%" />
        </div>

        {/* Charts/Tables Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#111] border border-[#333] rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Revenue Overview</h2>
            <div className="h-64 flex items-end justify-between gap-2 opacity-50">
              {/* Mock Bar Chart */}
              {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                <div key={i} className="w-full bg-[#DFFF00] rounded-t-sm" style={{ height: `${h}%` }}></div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
          
          <div className="bg-[#111] border border-[#333] rounded-lg p-6">
            <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <ActivityItem text="New user registered" time="2m ago" />
              <ActivityItem text="Ticket TKT-10293 sold" time="15m ago" />
              <ActivityItem text="Event 'Summer Festival' created" time="1h ago" />
              <ActivityItem text="Ticket TKT-92817 scanned" time="2h ago" />
              <ActivityItem text="Payout to organizer processed" time="5h ago" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  const isPositive = trend.startsWith("+");
  return (
    <div className="bg-[#111] border border-[#333] p-6 rounded-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-black rounded-lg border border-[#333] text-[#DFFF00]">
          {icon}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-400'}`}>
          {trend}
        </span>
      </div>
      <div>
        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold">{value}</h3>
      </div>
    </div>
  );
}

function ActivityItem({ text, time }: { text: string, time: string }) {
  return (
    <div className="flex items-start justify-between border-b border-[#222] pb-4 last:border-0 last:pb-0">
      <p className="text-sm text-gray-300">{text}</p>
      <span className="text-xs text-gray-500 whitespace-nowrap ml-4">{time}</span>
    </div>
  );
}
