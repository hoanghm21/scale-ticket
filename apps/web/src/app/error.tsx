"use client";

import { useEffect } from "react";
import { Button } from "../components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="min-h-screen flex items-center justify-center px-4 bg-[rgb(var(--color-bg))]"
    >
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-red-400 mb-3">
          Error
        </p>
        <h1 className="text-3xl font-display font-bold text-white mb-4">
          Something broke
        </h1>
        <p className="text-gray-400 mb-8">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Go home
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-6 text-xs text-gray-600 font-mono">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
