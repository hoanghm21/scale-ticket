export interface MockEvent {
  id: string;
  title: string;
  category: "Concerts" | "Sports" | "Arts & Theater";
  date: string;
  venue: string;
  image: string;
  priceStart: number;
  description?: string;
  artist?: string;
}

export const mockEvents: MockEvent[] = [
  {
    id: "e_1",
    title: "Neon Nights Neon Dreams World Tour",
    category: "Concerts",
    date: "Oct 24 • 8:00 PM",
    venue: "Starlight Arena, NY",
    image: "/images/neon_concert.png",
    priceStart: 129
  },
  {
    id: "e_2",
    title: "Championship Finals 2026",
    category: "Sports",
    date: "Nov 12 • 6:30 PM",
    venue: "MetLife Stadium, NJ",
    image: "/images/sports_stadium.png",
    priceStart: 250
  },
  {
    id: "e_3",
    title: "Symphony Under the Stars",
    category: "Concerts",
    date: "Dec 05 • 7:00 PM",
    venue: "Wembley Grand, LND",
    image: "/images/symphony_stars.png",
    priceStart: 85
  },
  {
    id: "e_4",
    title: "Hamilton: The Musical",
    category: "Arts & Theater",
    date: "Jan 10 • 2:00 PM",
    venue: "Broadway Theatre, NY",
    image: "/images/theater_stage.png",
    priceStart: 150
  },
  {
    id: "e_5",
    title: "F1 Grand Prix Weekend",
    category: "Sports",
    date: "Mar 15 • All Day",
    venue: "Marina Bay Circuit",
    image: "/images/f1_race.png",
    priceStart: 450
  },
  {
    id: "e_6",
    title: "Coachella Valley Festival",
    category: "Concerts",
    date: "Apr 20-22 • 3 Days",
    venue: "Empire Polo Club, CA",
    image: "/images/festival_outdoor.png",
    priceStart: 599
  }
];
