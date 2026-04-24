import type { ConnectionState } from "../hooks/useConnectionStatus";

export function StatusBar({ connection }: { connection: ConnectionState }) {
  const label =
    connection === "online" ? "Connected" : connection === "checking" ? "Connecting…" : "Offline";
  const dotClass =
    connection === "online" ? "status-dot ok" : connection === "checking" ? "status-dot warn" : "status-dot err";

  return (
    <span className="status" role="status" aria-live="polite">
      <span className={dotClass} aria-hidden="true" />
      {label}
    </span>
  );
}
