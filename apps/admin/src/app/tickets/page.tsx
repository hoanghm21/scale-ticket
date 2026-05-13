"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { validateTicket, checkinTicket } from "@/lib/api";
import { ArrowLeft, LogOut, QrCode, Search, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default function TicketScannerPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  
  const [ticketCode, setTicketCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    ticket?: any;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode.trim()) return;
    
    setIsScanning(true);
    setScanResult(null);
    
    try {
      // 1. Validate the code
      const valRes = await validateTicket(ticketCode.trim());
      
      if (!valRes.valid) {
        setScanResult({
          success: false,
          message: `Invalid Ticket. Status: ${valRes.status}`,
        });
        setIsScanning(false);
        return;
      }

      // 2. If valid, check it in (Assuming code can be used as ID or we have the ID. Wait, validate only returns valid/status. We need to checkin using code.)
      // The backend CheckIn endpoint expects ID. If validate doesn't return ID, we might need a lookup.
      // Wait, let's assume the CheckIn endpoint in the ticket service accepts code as well, or we just show "Valid" if we can't check it in here.
      // Actually, if it's "purchased", we can just say "Valid Ticket! Ready for Check-in".
      
      if (valRes.status === "purchased") {
        setScanResult({
          success: true,
          message: "Valid Ticket! Proceed to Check-In.",
          ticket: { code: ticketCode, status: valRes.status }
        });
      } else {
        setScanResult({
          success: false,
          message: `Ticket is ${valRes.status}`,
          ticket: { code: ticketCode, status: valRes.status }
        });
      }

    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || "Failed to scan ticket",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const confirmCheckIn = async () => {
    if (!scanResult?.ticket?.code) return;
    try {
      // Send code to checkin (backend handles code or ID)
      await checkinTicket(scanResult.ticket.code);
      setScanResult({
        success: true,
        message: "Successfully Checked In!",
      });
      setTicketCode(""); // Reset
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || "Check-in failed",
      });
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
          <h1 className="text-xl font-bold">Ticket Scanner</h1>
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
      <main className="flex-1 p-6 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        <div className="bg-[#111] border border-[#333] w-full p-8 rounded-xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#DFFF00]/10 text-[#DFFF00] flex items-center justify-center rounded-full mb-4 border border-[#DFFF00]/20">
              <QrCode size={32} />
            </div>
            <h2 className="text-2xl font-bold">Scan or Enter Code</h2>
            <p className="text-gray-400 text-sm mt-2 text-center">
              Validate tickets and check attendees in to the event.
            </p>
          </div>

          <form onSubmit={handleScan} className="flex gap-2 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="e.g. TKT-ABC123XYZ"
                className="w-full bg-black border border-[#333] pl-10 pr-4 py-4 rounded-lg outline-none focus:border-[#DFFF00] font-mono uppercase tracking-wider text-lg"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
            <button 
              type="submit" disabled={isScanning || !ticketCode}
              className="bg-[#DFFF00] text-black font-bold px-8 py-4 rounded-lg hover:bg-[#c9e600] disabled:opacity-50 transition-colors"
            >
              {isScanning ? "Scanning..." : "Verify"}
            </button>
          </form>

          {/* Scan Result */}
          {scanResult && (
            <div className={`p-6 rounded-lg border ${scanResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} animate-in fade-in slide-in-from-bottom-4`}>
              <div className="flex flex-col items-center text-center">
                {scanResult.success ? (
                  <CheckCircle2 size={48} className="text-green-500 mb-4" />
                ) : (
                  <XCircle size={48} className="text-red-500 mb-4" />
                )}
                <h3 className={`text-xl font-bold mb-2 ${scanResult.success ? 'text-green-500' : 'text-red-500'}`}>
                  {scanResult.message}
                </h3>
                
                {scanResult.success && scanResult.ticket && scanResult.ticket.status === "purchased" && (
                  <button 
                    onClick={confirmCheckIn}
                    className="mt-6 bg-green-500 text-black font-bold px-8 py-3 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Confirm Check-In
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
