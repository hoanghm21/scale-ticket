import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account — ScaleTicket",
  description: "Join ScaleTicket to book tickets for live events with real-time seat selection.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
