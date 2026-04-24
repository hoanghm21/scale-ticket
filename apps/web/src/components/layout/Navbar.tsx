"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket, User, LogOut, LayoutDashboard, ShoppingCart } from "lucide-react";
import { Button } from "../ui/Button";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

export function Navbar() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const cartItemsCount = useCartStore(state => state.items.length);

  // Fix Zustand hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
              <Ticket className="w-6 h-6" />
            </div>
            <Link href="/" className="text-2xl font-display font-bold text-white tracking-tight">
              ScaleTicket
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors">
              Discover
            </Link>
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors">
              Sports
            </Link>
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors">
              Concerts
            </Link>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
            
            {!mounted ? null : isAuthenticated ? (
              <div className="flex items-center space-x-4">
                
                {/* Global Cart Ticker */}
                <Link
                  href="/checkout"
                  aria-label={
                    cartItemsCount > 0
                      ? `Cart, ${cartItemsCount} item${cartItemsCount === 1 ? "" : "s"}`
                      : "Cart, empty"
                  }
                  className="relative p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" aria-hidden="true" />
                  {cartItemsCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 rounded-full shadow-md shadow-sky-500/40"
                    >
                      {cartItemsCount}
                    </span>
                  )}
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-label="Account menu"
                    aria-haspopup="menu"
                    aria-expanded={isDropdownOpen}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-dark border border-gray-700 text-indigo-400 hover:border-indigo-500/50 transition-colors focus:outline-none"
                >
                  <User className="w-5 h-5" aria-hidden="true" />
                </button>

                {isDropdownOpen && (
                  <div
                    role="menu"
                    aria-label="Account menu"
                    className="absolute right-0 mt-3 w-56 bg-black border border-gray-800 py-2 origin-top-right overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-gray-800 mb-2">
                      <p className="text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                    
                    <Link 
                      href="/dashboard"
                      onClick={() => setIsDropdownOpen(false)} 
                      className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-3 text-indigo-400" />
                      Dashboard
                    </Link>
                    
                    <button 
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                        router.push("/");
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-colors mt-2 border-t border-gray-800/50 pt-3"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login"><Button variant="ghost">Sign In</Button></Link>
                <Link href="/register"><Button variant="primary">Get Started</Button></Link>
              </div>
            )}
            
          </div>
          
        </div>
      </div>
    </nav>
  );
}
