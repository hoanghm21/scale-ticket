"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Navbar } from "../../components/layout/Navbar";
import { Button } from "../../components/ui/Button";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Checkout error:", error);
  }, [error]);

  return (
    <>
      <Navbar />
      <main role="alert" className="min-h-screen pt-32 px-4 flex flex-col items-center text-center">
        <p className="text-xs uppercase tracking-widest text-red-400 mb-3">
          Checkout failed
        </p>
        <h1 className="text-3xl font-display font-bold text-white mb-4">
          Payment could not be processed
        </h1>
        <p className="text-gray-400 max-w-md mb-2">
          Your card was <strong>not charged</strong>. Any held seats will be released shortly.
        </p>
        <p className="text-gray-500 text-sm max-w-md mb-8 font-mono">
          {error.message || "Unknown error"}
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/dashboard">
            <Button variant="secondary">My tickets</Button>
          </Link>
        </div>
      </main>
    </>
  );
}
