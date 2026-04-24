"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Navbar } from "../../../components/layout/Navbar";
import { Button } from "../../../components/ui/Button";

export default function EventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Event route error:", error);
  }, [error]);

  return (
    <>
      <Navbar />
      <main role="alert" className="min-h-screen pt-32 px-4 flex flex-col items-center text-center">
        <p className="text-xs uppercase tracking-widest text-red-400 mb-3">
          Event unavailable
        </p>
        <h1 className="text-3xl font-display font-bold text-white mb-4">
          Couldn&apos;t load event
        </h1>
        <p className="text-gray-400 max-w-md mb-8">
          {error.message || "This event failed to load. It may be sold out, cancelled, or temporarily unavailable."}
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Retry</Button>
          <Link href="/">
            <Button variant="secondary">Browse events</Button>
          </Link>
        </div>
      </main>
    </>
  );
}
