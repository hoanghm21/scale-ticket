import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "ScaleTicket — Real-time Event Ticketing",
  description:
    "Discover and book tickets for live events with real-time seat selection, instant booking, and secure payments.",
  keywords: ["tickets", "events", "live", "booking", "concerts", "sports"],
  openGraph: {
    title: "ScaleTicket — Real-time Event Ticketing",
    description: "Discover and book tickets for live events.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="min-h-screen bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text))] selection:bg-indigo-500/30">
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
