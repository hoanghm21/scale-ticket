import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { MockEvent } from "@/lib/mock";

export function EventCard({ event }: { event: MockEvent }) {
  return (
    <Link href={`/event/${event.id}`} className="group block h-full">
      {/* Outer: sharp brutalist box with neon glow on hover */}
      <div className="h-full border border-gray-800 transition-all duration-500 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4),0_0_60px_-15px_rgba(168,85,247,0.25)]">
        <div className="relative h-full flex flex-col bg-surface-dark-secondary">

          {/* Image Box */}
          <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-gray-800">
            <Image
              src={event.image}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80" />

            {/* Category Badge */}
            <div className="absolute top-4 left-4 bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white text-xs font-bold px-3 py-1 uppercase tracking-widest shadow-lg shadow-sky-600/30">
              {event.category}
            </div>
          </div>

          {/* Content Box */}
          <div className="flex-1 p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-xl text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors">
                {event.title}
              </h3>

              <div className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 opacity-70" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 opacity-70" />
                  <span className="truncate">{event.venue}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">From</p>
              <p className="font-bold text-lg text-gray-900 dark:text-white">
                <span className="text-xs align-top mr-0.5">$</span>
                {event.priceStart}
              </p>
            </div>
          </div>

        </div>
      </div>
    </Link>
  );
}
