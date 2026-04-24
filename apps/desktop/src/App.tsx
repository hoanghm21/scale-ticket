import { useConnectionStatus } from "./hooks/useConnectionStatus";
import { TicketList } from "./components/TicketList";
import { StatusBar } from "./components/StatusBar";

export function App() {
  const connection = useConnectionStatus();

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-mark">◆</span>
          <span className="logo-text">ScaleTicket</span>
          <span className="logo-tag">Desktop</span>
        </div>
        <StatusBar connection={connection} />
      </header>

      <main className="app-main">
        <section className="hero">
          <h1>Your tickets, offline-first.</h1>
          <p>
            Cached copies of every ticket you own. Syncs automatically when you
            come back online.
          </p>
        </section>

        <TicketList />
      </main>

      <footer className="app-footer">
        <span>v0.1.0</span>
        <span>Gateway: {import.meta.env.VITE_GATEWAY_URL || "http://localhost:4000"}</span>
      </footer>
    </div>
  );
}
