"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:4003";

export interface SeatStatusChange {
  seatId: string;
  status: "available" | "held" | "sold";
  heldBy: string | null;
}

interface UseSocketOptions {
  eventId: string;
  onSnapshot: (seats: any[]) => void;
  onSeatChange: (change: SeatStatusChange) => void;
  onLockAck: (ack: { seatId: string; success: boolean; reason?: string; seat?: any }) => void;
}

export function useEventSocket({ eventId, onSnapshot, onSeatChange, onLockAck }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Hold latest callbacks in refs so the socket effect can stay keyed on eventId
  // alone — re-subscribing on every render would tear down the socket connection.
  const onSnapshotRef = useRef(onSnapshot);
  const onSeatChangeRef = useRef(onSeatChange);
  const onLockAckRef = useRef(onLockAck);
  useEffect(() => { onSnapshotRef.current = onSnapshot; }, [onSnapshot]);
  useEffect(() => { onSeatChangeRef.current = onSeatChange; }, [onSeatChange]);
  useEffect(() => { onLockAckRef.current = onLockAck; }, [onLockAck]);

  useEffect(() => {
    const socket = io(REALTIME_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // Join the event room as soon as we connect
      socket.emit("join_event", eventId);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // Tier 4: Listen for the full snapshot on room join
    socket.on("inventory_snapshot", (seats: any[]) => {
      onSnapshotRef.current(seats);
    });

    // Tier 4: Listen for individual seat status changes
    socket.on("seat_status_change", (change: SeatStatusChange) => {
      onSeatChangeRef.current(change);
      
      // Notify user when someone else buys a ticket
      if (change.status === "sold") {
        toast.info("A ticket was just purchased by another user!", {
          description: `Seat ${change.seatId} is no longer available.`,
          duration: 3000,
        });
      }
    });

    // Tier 5: Lock acknowledgment
    socket.on("lock_ack", (ack: any) => {
      onLockAckRef.current(ack);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [eventId]); // reconnect if eventId changes

  // Tier 5: Emit a lock request
  const emitLock = useCallback(
    (seatId: string) => {
      socketRef.current?.emit("lock_seat", { eventId, seatId });
    },
    [eventId]
  );

  // Tier 5: Emit an unlock request
  const emitUnlock = useCallback(
    (seatId: string) => {
      socketRef.current?.emit("unlock_seat", { eventId, seatId });
    },
    [eventId]
  );

  return { connected, emitLock, emitUnlock };
}
