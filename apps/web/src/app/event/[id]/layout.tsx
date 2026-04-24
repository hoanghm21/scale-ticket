import type { Metadata } from "next";
import { mockEvents } from "@/lib/mock";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const event = mockEvents.find((e) => e.id === params.id);

  if (!event) {
    return {
      title: "Event not found — ScaleTicket",
    };
  }

  const title = `${event.title} — ScaleTicket`;
  const description = `${event.category} at ${event.venue}, ${event.date}. Tickets from $${event.priceStart}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: event.image, alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [event.image],
    },
  };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
