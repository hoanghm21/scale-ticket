import { useAuthStore } from "@/store/authStore";

const API_BASE = ""; // Next.js rewrites proxy to gateway

// Ensure fetch uses the auth token
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Use explicit try/catch for better error handling
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });
  
  if (!res.ok) {
    let errorMsg = `API Error: ${res.status}`;
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch (e) {
      // Not JSON
    }
    throw new Error(errorMsg);
  }
  
  return res.json();
}

// Events API
export async function getEvents() {
  return fetchWithAuth("/api/events");
}

export async function createEvent(data: {
  title: string;
  category: string;
  venue: string;
  date: string;
  image: string;
  priceStart: number;
}) {
  return fetchWithAuth("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Tickets API
export async function validateTicket(code: string) {
  return fetchWithAuth("/api/tickets/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export async function checkinTicket(id: string) {
  return fetchWithAuth(`/api/tickets/${id}/checkin`, {
    method: "POST",
  });
}

