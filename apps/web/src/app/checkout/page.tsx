"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import confetti from "canvas-confetti";
import { CreditCard, CheckCircle2, ShieldCheck, ChevronLeft, Ticket } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useTicketStore } from "@/store/ticketStore";
import { mockEvents } from "@/lib/mock";

export default function CheckoutPage() {
  const router = useRouter();
  const cartStore = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const addTicket = useTicketStore(state => state.addTicket);
  const [method, setMethod] = useState<"card" | "paypal">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
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

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Hit the Gateway API
      const res = await fetch("http://localhost:4000/api/checkout/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: cartStore.eventId || "test_event_123",
          cartItems: cartStore.items.map(s => ({
            seatId: s.id,
            section: s.section,
            row: s.row,
            col: s.col,
            price: s.price
          }))
        })
      });

      if (!res.ok) throw new Error("Payment Failed");

      const data = await res.json();
      console.log("Stripe Client Secret received:", data.clientSecret);

      const eventDetails = mockEvents.find(e => e.id === cartStore.eventId) || mockEvents[0];

      const ticketId = "TKT-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      addTicket({
        id: ticketId,
        userId: user?.id || "",
        eventId: cartStore.eventId || "",
        eventTitle: eventDetails.title,
        eventDate: eventDetails.date,
        eventVenue: eventDetails.venue,
        eventImage: eventDetails.image,
        seats: cartStore.items.map(item => ({
          id: item.id,
          section: item.section,
          row: item.row,
          col: item.col,
          price: item.price
        })),
        totalPrice: cartStore.getTotal(),
        purchaseDate: Date.now()
      });

      // Fire notification asynchronously through the Gateway
      fetch("http://localhost:4000/api/notify/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email || "guest@example.com",
          firstName: user?.firstName || "Guest",
          eventTitle: eventDetails.title,
          ticketId: ticketId,
          seats: cartStore.items.length
        })
      }).catch(err => console.error("Notification failed", err));

      setIsProcessing(false);
      setSuccess(true);
      cartStore.clearCart();
      
      // Confetti splash!
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#5C7CFA', '#10B981', '#F59E0B']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#5C7CFA', '#10B981', '#F59E0B']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Redirect to dashboard after a bit
      setTimeout(() => {
        router.push("/dashboard");
      }, 4000);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      alert("Payment intent failed. Ensure services/payment is running.");
    }
  };

  const seatsSubtotal = cartStore.getTotal();
  const serviceFee = seatsSubtotal * 0.10; // 10% fee
  const taxes = seatsSubtotal * 0.06; // 6% tax
  const finalTotal = seatsSubtotal + serviceFee + taxes;

  if (success) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-32 pb-20 px-4 flex justify-center items-center">
          <div className="bg-[#0A0A0A] border border-gray-800 p-10 max-w-lg w-full text-center animate-slide-up">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-4">Payment Successful!</h1>
            <p className="text-gray-400 mb-8 text-lg">
              Your tickets are secured. We are redirecting you to your digital ticket dashboard...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
        
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Seat Selection
        </button>

        <h1 className="text-3xl font-display font-bold text-white mb-8 flex items-center">
          <ShieldCheck className="w-8 h-8 mr-3 text-indigo-400" />
          Secure Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Form Side */}
          <div className="lg:col-span-2 space-y-8">
            
            <div className="bg-[#0A0A0A] p-8 border border-gray-800">
              <h2 className="text-xl font-bold text-white mb-6">Contact Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-first-name" className="sr-only">First name</label>
                  <input id="checkout-first-name" name="firstName" autoComplete="given-name" type="text" placeholder="First Name" aria-label="First name" className="w-full bg-black border border-gray-700 focus:border-indigo-500 px-4 py-3 text-white outline-none" defaultValue={user?.firstName || ""} />
                </div>
                <div>
                  <label htmlFor="checkout-last-name" className="sr-only">Last name</label>
                  <input id="checkout-last-name" name="lastName" autoComplete="family-name" type="text" placeholder="Last Name" aria-label="Last name" className="w-full bg-black border border-gray-700 focus:border-indigo-500 px-4 py-3 text-white outline-none" defaultValue={user?.lastName || ""} />
                </div>
                <div className="col-span-2">
                  <label htmlFor="checkout-email" className="sr-only">Email address</label>
                  <input id="checkout-email" name="email" autoComplete="email" type="email" placeholder="Email Address" aria-label="Email address" className="w-full bg-black border border-gray-700 focus:border-indigo-500 px-4 py-3 text-white outline-none" defaultValue={user?.email || ""} />
                </div>
              </div>
            </div>

            <div className="bg-[#0A0A0A] p-8 border border-gray-800">
              <h2 className="text-xl font-bold text-white mb-6">Payment Method</h2>
              
              <div className="flex space-x-4 mb-6" role="radiogroup" aria-label="Payment method">
                <button
                  role="radio"
                  aria-checked={method === "card"}
                  aria-label="Pay with credit card"
                  onClick={() => setMethod("card")}
                  className={`flex-1 py-4 border rounded-xl flex items-center justify-center font-medium transition-colors ${method === "card" ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-gray-700 bg-surface-dark text-gray-400 hover:border-gray-500"}`}
                >
                  <CreditCard className="w-5 h-5 mr-2" aria-hidden="true" /> Credit Card
                </button>
                <button
                  role="radio"
                  aria-checked={method === "paypal"}
                  aria-label="Pay with PayPal"
                  onClick={() => setMethod("paypal")}
                  className={`flex-1 py-4 border rounded-xl flex items-center justify-center font-medium transition-colors ${method === "paypal" ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-gray-700 bg-surface-dark text-gray-400 hover:border-gray-500"}`}
                >
                  <span className="font-bold italic mr-1 text-[#003087] dark:text-[#0079C1]">Pay</span>
                  <span className="font-bold italic text-[#0079C1] dark:text-[#00457C]">Pal</span>
                </button>
              </div>

              {method === "card" && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label htmlFor="checkout-card-number" className="sr-only">Card number</label>
                    <input id="checkout-card-number" name="cardNumber" autoComplete="cc-number" inputMode="numeric" type="text" placeholder="Card Number" aria-label="Card number" className="w-full bg-surface-dark border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="checkout-card-expiry" className="sr-only">Expiration date, MM slash YY</label>
                      <input id="checkout-card-expiry" name="cardExpiry" autoComplete="cc-exp" inputMode="numeric" type="text" placeholder="MM/YY" aria-label="Expiration date" className="w-full bg-surface-dark border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div>
                      <label htmlFor="checkout-card-cvc" className="sr-only">Card security code</label>
                      <input id="checkout-card-cvc" name="cardCvc" autoComplete="cc-csc" inputMode="numeric" type="text" placeholder="CVC" aria-label="Security code" className="w-full bg-surface-dark border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Cart Side */}
          <div className="bg-[#0A0A0A] p-8 border border-gray-800 h-fit sticky top-28">
            <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
            
            <div className="flex items-start mb-6 pb-6 border-b border-gray-800">
              <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mr-4 shrink-0">
                <Ticket className="w-8 h-8 text-gray-500" />
              </div>
              <div>
                <h3 className="text-white font-bold mb-1">ScaleTicket Standard Entry</h3>
                <p className="text-sm text-gray-400">{cartStore.items.length}x Selected Seats</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Tickets ({cartStore.items.length})</span>
                <span className="text-white font-medium">${seatsSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee</span>
                <span className="text-white font-medium">${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes</span>
                <span className="text-white font-medium">${taxes.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-8 pt-4 border-t border-gray-800">
              <span className="text-white font-medium">Total</span>
              <span className="text-3xl font-display font-bold text-indigo-400">${finalTotal.toFixed(2)}</span>
            </div>

            <Button 
              size="lg" 
              className="w-full relative overflow-hidden" 
              onClick={handlePayment}
              disabled={isProcessing || cartStore.items.length === 0}
            >
              {isProcessing ? "Processing..." : `Pay $${finalTotal.toFixed(2)}`}
            </Button>
            <p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> All transactions are highly encrypted
            </p>
          </div>

        </div>

      </main>
    </>
  );
}
