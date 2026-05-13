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

import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe outside of component to avoid recreating it
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_TYooMQauvdEDq54NiTphI7jx");

function StripeCheckoutForm({
  clientSecret,
  intentId,
  finalTotal,
  onSuccess,
}: {
  clientSecret: string;
  intentId: string;
  finalTotal: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      // Confirm the payment via Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/dashboard",
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "An error occurred during payment.");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Still call the mock confirm endpoint so the backend generates the ticket
        await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intentId }),
        });
        
        onSuccess();
      } else {
        setErrorMessage("Payment was not successful. Please try again.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "An unexpected error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePayment} className="space-y-6">
      <PaymentElement className="bg-white p-4 rounded-xl" />
      {errorMessage && <div className="text-red-500 text-sm mt-2">{errorMessage}</div>}
      
      <Button 
        type="submit"
        size="lg" 
        className="w-full relative overflow-hidden mt-6" 
        disabled={isProcessing || !stripe || !elements}
      >
        {isProcessing ? "Processing..." : `Pay $${finalTotal.toFixed(2)}`}
      </Button>
      <p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center">
        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> All transactions are highly encrypted by Stripe
      </p>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const cartStore = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const createTicketViaAPI = useTicketStore(state => state.createTicketViaAPI);
  
  const [method, setMethod] = useState<"card" | "paypal">("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const seatsSubtotal = cartStore.getTotal();
  const serviceFee = seatsSubtotal * 0.10; // 10% fee
  const taxes = seatsSubtotal * 0.06; // 6% tax
  const finalTotal = seatsSubtotal + serviceFee + taxes;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  // Fetch payment intent when the cart is loaded
  useEffect(() => {
    if (mounted && isAuthenticated && cartStore.items.length > 0 && !clientSecret) {
      const fetchIntent = async () => {
        try {
          const res = await fetch("/api/checkout/intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId: cartStore.eventId || "test_event_123",
              holderId: user?.id || "anonymous",
              userId: user?.id,
              cartItems: cartStore.items.map(s => ({
                seatId: s.id,
                section: s.section,
                row: s.row,
                col: s.col,
                price: s.price
              }))
            })
          });

          if (res.ok) {
            const data = await res.json();
            setClientSecret(data.clientSecret);
            setIntentId(data.intentId);
          }
        } catch (e) {
          console.error("Failed to create intent", e);
        }
      };
      
      fetchIntent();
    }
  }, [mounted, isAuthenticated, cartStore.items, cartStore.eventId, user?.id, clientSecret]);

  if (!mounted || !isAuthenticated) return null;

  const handleSuccess = async () => {
    try {
      // Step 3: Create ticket via the Ticket Service API
      const { fetchEventById } = await import("@/lib/api");
      const eventDetails = await fetchEventById(cartStore.eventId || "");
      const fallbackEvent = { title: "Event", date: "", venue: "", image: "" };
      const ev = eventDetails || fallbackEvent;

      const ticketData = {
        userId: user?.id || "",
        eventId: cartStore.eventId || "",
        eventTitle: ev.title,
        eventDate: ev.date,
        eventVenue: ev.venue,
        eventImage: ev.image,
        seats: cartStore.items.map(item => ({
          id: item.id,
          section: item.section,
          row: item.row,
          col: item.col,
          price: item.price
        })),
        totalPrice: finalTotal, // Using final total including taxes
      };

      const token = useAuthStore.getState().token || "";
      const created = await createTicketViaAPI(ticketData, token);
      const ticketId = created?.id || created?.ticketCode || "TKT-LOCAL";

      // Step 4: Fire notification asynchronously (best-effort)
      fetch("/api/notify/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email || "guest@example.com",
          firstName: user?.firstName || "Guest",
          eventTitle: ev.title,
          ticketId: ticketId,
          seats: cartStore.items.length
        })
      }).catch(err => console.error("Notification failed (non-blocking):", err));

      setSuccess(true);
      cartStore.clearCart();
      
      // Confetti splash!
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#5C7CFA', '#10B981', '#F59E0B'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#5C7CFA', '#10B981', '#F59E0B'] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();

      // Redirect to dashboard after a bit
      setTimeout(() => {
        router.push("/dashboard");
      }, 4000);
    } catch (e) {
      console.error("Success handling error:", e);
    }
  };

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
                <div className="animate-fade-in">
                  {clientSecret && intentId ? (
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                      <StripeCheckoutForm 
                        clientSecret={clientSecret} 
                        intentId={intentId} 
                        finalTotal={finalTotal} 
                        onSuccess={handleSuccess} 
                      />
                    </Elements>
                  ) : (
                    <div className="h-32 flex items-center justify-center border border-gray-700 rounded-xl bg-surface-dark">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                      <span className="ml-3 text-gray-400">Initializing secure payment...</span>
                    </div>
                  )}
                </div>
              )}
              
              {method === "paypal" && (
                <div className="h-32 flex items-center justify-center border border-gray-700 rounded-xl bg-surface-dark animate-fade-in text-gray-400">
                  PayPal integration is not available in this demo.
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

            <div className="flex justify-between items-center pt-4 border-t border-gray-800">
              <span className="text-white font-medium">Total</span>
              <span className="text-3xl font-display font-bold text-indigo-400">${finalTotal.toFixed(2)}</span>
            </div>
            
            {/* The Pay button is now inside the StripeCheckoutForm */}
          </div>

        </div>

      </main>
    </>
  );
}
