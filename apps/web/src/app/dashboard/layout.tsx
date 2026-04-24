import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Tickets — ScaleTicket",
  description: "View your purchased tickets, upcoming events, and account history.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
