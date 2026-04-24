import { useQuery } from "@tanstack/react-query";
import { invoke, isTauri } from "../lib/tauri";

interface CachedTicket {
  id: string;
  event_title: string;
  event_date: string;
  event_venue: string;
  seats: Array<{ section: string; row: number; col: number }>;
  purchase_date: number;
}

async function fetchCachedTickets(): Promise<CachedTicket[]> {
  if (!isTauri()) {
    // Browser dev mode — return empty; the Rust side isn't running.
    return [];
  }
  return invoke<CachedTicket[]>("get_cached_tickets");
}

export function TicketList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", "cached"],
    queryFn: fetchCachedTickets,
  });

  if (isLoading) {
    return <div className="empty">Loading cached tickets…</div>;
  }

  if (error) {
    return (
      <div className="empty">
        Couldn&apos;t load cached tickets
        <div style={{ fontSize: 12, marginTop: 8 }}>
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="empty">
        No tickets cached yet. Sign in and purchase on the web app, then sync here.
      </div>
    );
  }

  return (
    <div className="ticket-grid">
      {data.map((t) => (
        <article key={t.id} className="ticket-card">
          <div className="ticket-title">{t.event_title}</div>
          <div className="ticket-meta">
            {t.event_date} · {t.event_venue}
          </div>
          <div>
            {t.seats.map((s, i) => (
              <span key={i} className="ticket-seat">
                {s.section} R{s.row + 1}·C{s.col + 1}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
