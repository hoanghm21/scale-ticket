import { useEffect, useState } from "react";

export type ConnectionState = "online" | "offline" | "checking";

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) || "http://localhost:4000";

export function useConnectionStatus(): ConnectionState {
  const [state, setState] = useState<ConnectionState>("checking");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2000);
        const r = await fetch(`${GATEWAY_URL}/health`, { signal: controller.signal });
        clearTimeout(t);
        if (!cancelled) setState(r.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setState("offline");
      }
    };

    check();
    const id = setInterval(check, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}
