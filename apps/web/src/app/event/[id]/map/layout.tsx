import type { Metadata } from "next";
import { mockEvents } from "@/lib/mock";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const event = mockEvents.find((e) => e.id === params.id);
  const title = event ? `Select seats — ${event.title}` : "Select seats — ScaleTicket";
  return {
    title,
    description: event
      ? `Pick your seats for ${event.title} at ${event.venue}.`
      : "Interactive seat map.",
    robots: { index: false, follow: false },
  };
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
