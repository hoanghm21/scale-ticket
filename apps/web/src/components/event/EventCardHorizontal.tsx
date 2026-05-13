import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { MockEvent } from "@/lib/mock";
import { Button } from "../ui/Button";

export function EventCardHorizontal({ event }: { event: MockEvent }) {
  return (
    <div className="group block w-full border border-gray-800 transition-all duration-500 hover:border-indigo-500/50 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.4),0_0_60px_-15px_rgba(168,85,247,0.25)]">
      <div className="flex flex-col md:flex-row bg-surface-dark-secondary min-h-[240px]">
        {/* Image Box - Left */}
        <div className="relative w-full md:w-2/5 lg:w-1/3 aspect-[16/9] md:aspect-auto overflow-hidden border-b md:border-b-0 md:border-r border-gray-800 shrink-0">
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 md:from-black/60 to-transparent opacity-80" />

          {/* Category Badge */}
          <div className="absolute top-4 left-4 bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white text-xs font-bold px-3 py-1 uppercase tracking-widest shadow-lg shadow-sky-600/30 z-10">
            {event.category}
          </div>
        </div>

        {/* Content Box - Right */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-4">
              <h3 className="font-display font-bold text-2xl md:text-3xl text-gray-900 dark:text-white leading-tight group-hover:text-indigo-400 transition-colors">
                <Link href={`/event/${event.id}`} className="hover:underline hover:text-indigo-400">
                  {event.title}
                </Link>
              </h3>
              
              <div className="hidden sm:block text-right shrink-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tickets from</p>
                <p className="font-bold text-2xl text-gray-900 dark:text-white">
                  <span className="text-base align-top mr-0.5 text-gray-400">$</span>
                  {event.priceStart}
                </p>
              </div>
            </div>

            <p className="mt-3 text-gray-400 max-w-2xl line-clamp-2 md:line-clamp-3">
              {event.description || "Join us for an unforgettable experience with amazing live performances, spectacular visuals, and memories that will last a lifetime."}
            </p>

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-400">
              <div className="flex items-center bg-black/40 px-3 py-1.5 rounded border border-gray-800">
                <Calendar className="w-4 h-4 mr-2 text-indigo-400" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center bg-black/40 px-3 py-1.5 rounded border border-gray-800">
                <MapPin className="w-4 h-4 mr-2 text-indigo-400" />
                <span>{event.venue}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="sm:hidden w-full flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">From</p>
              <p className="font-bold text-xl text-gray-900 dark:text-white">
                <span className="text-xs align-top mr-0.5">$</span>
                {event.priceStart}
              </p>
            </div>
            
            <div className="w-full sm:w-auto flex items-center justify-end sm:ml-auto">
              <Link href={`/event/${event.id}`} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8">
                  <Ticket className="w-4 h-4" />
                  <span>Get Tickets</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
