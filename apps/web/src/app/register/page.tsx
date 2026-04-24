"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock registration delay
    setTimeout(() => {
      login("mock_jwt_token_123", {
        id: "u_" + Math.random().toString(36).substr(2, 9),
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: "user"
      });
      router.push("/dashboard");
    }, 800);
  };

  return (
    <main className="min-h-screen flex items-center justify-center py-20 px-4 bg-[#050505] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-950/20 via-indigo-950/20 to-purple-950/20 pointer-events-none" />
      
      <div className="bg-[#0A0A0A] border border-gray-800 p-8 md:p-10 max-w-md w-full relative z-10 animate-fade-in shadow-2xl shadow-indigo-500/10">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30 cursor-pointer">
              <Ticket className="w-6 h-6" />
            </div>
          </Link>
        </div>
        
        <h1 className="text-2xl font-display font-bold text-white text-center mb-2">Create Account</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">Join ScaleTicket to secure your seats</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">First Name</label>
              <input 
                type="text" 
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-black border border-gray-800 focus:border-indigo-500 rounded-md px-4 py-3 text-white outline-none transition-colors" 
                placeholder="Alex" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Last Name</label>
              <input 
                type="text" 
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-black border border-gray-800 focus:border-indigo-500 rounded-md px-4 py-3 text-white outline-none transition-colors" 
                placeholder="Rivers" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-gray-800 focus:border-indigo-500 rounded-md px-4 py-3 text-white outline-none transition-colors" 
              placeholder="you@example.com" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-800 focus:border-indigo-500 rounded-md px-4 py-3 text-white outline-none transition-colors" 
              placeholder="••••••••" 
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full py-3 mt-4 flex items-center justify-center">
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>Sign Up <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
