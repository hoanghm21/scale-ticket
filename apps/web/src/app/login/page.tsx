"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock login delay
    setTimeout(() => {
      login("mock_jwt_token_123", {
        id: "u_1",
        email: email || "alex.rivers@example.com",
        firstName: "Alex",
        lastName: "Rivers",
        role: "user"
      });
      router.push("/dashboard");
    }, 800);
  };

  return (
    <main className="min-h-screen flex items-center justify-center py-20 px-4 bg-[#050505] relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-950/20 via-indigo-950/20 to-purple-950/20 pointer-events-none" />
      
      <div className="bg-[#0A0A0A] border border-gray-800 p-8 md:p-10 max-w-md w-full relative z-10 animate-fade-in shadow-2xl shadow-indigo-500/10">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30 cursor-pointer">
              <Ticket className="w-6 h-6" />
            </div>
          </Link>
        </div>
        
        <h1 className="text-2xl font-display font-bold text-white text-center mb-2">Welcome Back</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">Enter your credentials to access your tickets</p>

        <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-400">Password</label>
              <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot?</a>
            </div>
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
              <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account? <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Create one</Link>
        </p>

        <div className="mt-8 flex items-center justify-center text-xs text-gray-600">
          <Lock className="w-3 h-3 mr-1" /> Secure authentication
        </div>
      </div>
    </main>
  );
}
