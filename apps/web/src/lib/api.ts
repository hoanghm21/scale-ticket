import type { MockEvent } from "./mock";

const API_BASE = "";  // Next.js rewrites proxy to gateway

/**
 * Fetches all events from the Event Service via the API gateway.
 * Falls back to local mock data if the API is unreachable.
 */
export async function fetchEvents(): Promise<MockEvent[]> {
  try {
    const res = await fetch(`${API_BASE}/api/events`, {
      next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const data = await res.json();
    return data.events as MockEvent[];
  } catch (err) {
    console.warn("Event API unavailable, falling back to mock data:", err);
    // Lazy import mock data as fallback
    const { mockEvents } = await import("./mock");
    return mockEvents;
  }
}

/**
 * Fetches a single event by ID (supports legacy "e_1" format).
 * Falls back to local mock data if the API is unreachable.
 */
export async function fetchEventById(id: string): Promise<MockEvent | null> {
  try {
    const res = await fetch(`${API_BASE}/api/events/${id}`, {
      next: { revalidate: 60 },
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API returned ${res.status}`);

    return (await res.json()) as MockEvent;
  } catch (err) {
    console.warn(`Event API unavailable for ${id}, falling back to mock data:`, err);
    const { mockEvents } = await import("./mock");
    return mockEvents.find((e) => e.id === id) ?? null;
  }
}
