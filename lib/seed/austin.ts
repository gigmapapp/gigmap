import type { Category, Database, GeoLocation, Performer, Video } from "@/lib/types";
import { venueOffsetIso } from "@/lib/venue-instant";
import { lookupVenueTimeZone } from "@/lib/venue-zone";

type SeedPerformer = Omit<Performer, "createdAt">;

export type SeedGig = {
  id: string;
  performerId: string;
  title: string;
  description: string;
  category: Category;
  /** Days after the Chicago calendar date when the seed runs. */
  dayOffset: number;
  hour: number;
  minute: number;
  location: GeoLocation;
};

const videos = {
  maya: [
    clip("maya-v1", "Hotel Vegas late set", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"),
    clip("maya-v2", "Living-room rehearsal", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"),
    clip("maya-v3", "YouTube clip (URL embed)", "https://www.youtube.com/watch?v=aqz-KE-bpKQ"),
  ],
  broken: [
    clip("broken-v1", "Continental Club clip", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"),
    clip("broken-v2", "Practice space take", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"),
  ],
  nova: [
    clip("nova-v1", "Empire Control Room", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"),
    clip("nova-v2", "Sunset mix excerpt", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"),
  ],
  elijah: [
    clip("elijah-v1", "C-Boy's trio night", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"),
  ],
  velvet: [
    clip("velvet-v1", "Mohawk indoor", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"),
    clip("velvet-v2", "Demo reel", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"),
  ],
  luna: [
    clip("luna-v1", "Warehouse peak-time", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4"),
  ],
  rio: [
    clip("rio-v1", "Stubb's patio", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4"),
    clip("rio-v2", "Horn section close-up", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4"),
  ],
  harper: [
    clip("harper-v1", "Saxon Pub open mic", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"),
    clip("harper-v2", "Porch take", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"),
  ],
  bass: [
    clip("bass-v1", "Parish club set", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"),
  ],
  copper: [
    clip("copper-v1", "White Horse two-step", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"),
    clip("copper-v2", "Steel guitar feature", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"),
  ],
} satisfies Record<string, Video[]>;

function clip(id: string, title: string, url: string): Video {
  return { id, title, sourceType: "url", url };
}

export const SEED_PERFORMERS: SeedPerformer[] = [
  {
    id: "maya-chen",
    name: "Maya Chen",
    category: "solo",
    bio: "Austin singer-songwriter with a hushed folk voice and looping guitar. Friday nights on the East Side, Sunday afternoons in coffeehouses.",
    city: "Austin, TX",
    genres: ["indie folk", "singer-songwriter"],
    videos: videos.maya,
  },
  {
    id: "broken-strings",
    name: "The Broken Strings",
    category: "band",
    bio: "Four-piece garage rock from South Austin. Loud choruses, cheap amps, and a standing date with the Continental Club.",
    city: "Austin, TX",
    genres: ["garage rock", "indie"],
    videos: videos.broken,
  },
  {
    id: "dj-nova",
    name: "DJ Nova",
    category: "dj",
    bio: "Warehouse house and disco edits. Resident energy at Empire and after-hours on East 6th.",
    city: "Austin, TX",
    genres: ["house", "disco"],
    videos: videos.nova,
  },
  {
    id: "elijah-brooks",
    name: "Elijah Brooks",
    category: "solo",
    bio: "Jazz guitar, standards, and original ballads. Think hotel lobby at midnight, but warmer.",
    city: "Austin, TX",
    genres: ["jazz", "standards"],
    videos: videos.elijah,
  },
  {
    id: "velvet-static",
    name: "Velvet Static",
    category: "band",
    bio: "Dream-pop five-piece. Pedalboards, fog, and choruses that hang in the rafters at Mohawk.",
    city: "Austin, TX",
    genres: ["dream pop", "shoegaze"],
    videos: videos.velvet,
  },
  {
    id: "luna-park",
    name: "Luna Park",
    category: "dj",
    bio: "Hypnotic techno and late-night warehouse sets. Peak time starts after 1am.",
    city: "Austin, TX",
    genres: ["techno", "minimal"],
    videos: videos.luna,
  },
  {
    id: "nightbirds",
    name: "Rio & the Nightbirds",
    category: "band",
    bio: "Latin soul, cumbia, and Saturday-night horns. The dance floor fills before the second chorus.",
    city: "Austin, TX",
    genres: ["latin soul", "cumbia"],
    videos: videos.rio,
  },
  {
    id: "harper-quinn",
    name: "Harper Quinn",
    category: "solo",
    bio: "Alto, nylon-string guitar, and stories from the Drag. Quiet rooms only.",
    city: "Austin, TX",
    genres: ["folk", "americana"],
    videos: videos.harper,
  },
  {
    id: "bassline-society",
    name: "Bassline Society",
    category: "dj",
    bio: "Hip-hop, bounce, and dirty south classics. Wedding-safe until midnight, then the crate flips.",
    city: "Austin, TX",
    genres: ["hip-hop", "bounce"],
    videos: videos.bass,
  },
  {
    id: "copper-notes",
    name: "The Copper Notes",
    category: "band",
    bio: "Pedal steel, two-part harmony, and honky-tonk heartbreak. White Horse regulars.",
    city: "Austin, TX",
    genres: ["americana", "honky-tonk"],
    videos: videos.copper,
  },
];

/**
 * Original Austin run (Sep 11–Oct 10) scaled onto tomorrow through about six weeks,
 * measured from the Chicago calendar date at seed time. Times stay on the venue clock.
 */
export const SEED_GIGS: SeedGig[] = [
  gig("gig-antones-maya", "maya-chen", "Late set at Antone's", "Solo looping set in the front room. Come early if you want a seat along the bar.", "solo", 1, 21, 30, 30.2661, -97.7396, "Antone's Nightclub, 305 E 5th St"),
  gig("gig-stubbs-rio", "nightbirds", "Patio dance night", "Rio & the Nightbirds bring the horns outside. Food trucks stay open late.", "band", 2, 20, 0, 30.2685, -97.7362, "Stubb's BBQ, 801 Red River St"),
  gig("gig-mohawk-velvet", "velvet-static", "Indoor / indoor", "Full band, fog, and the Mohawk indoor PA. Support TBA.", "band", 4, 22, 0, 30.27, -97.736, "Mohawk Austin, 912 Red River St"),
  gig("gig-empire-nova", "dj-nova", "Disco edits until close", "Nova on the booth from 11 to 2. No guest list, just show up.", "dj", 11, 23, 0, 30.2674, -97.7366, "Empire Control Room, 606 E 7th St"),
  gig("gig-continental-broken", "broken-strings", "Continental Club residency", "Monthly loud night. Earplugs at the merch table.", "band", 12, 21, 0, 30.2478, -97.7505, "Continental Club, 1315 S Congress Ave"),
  gig("gig-cboy-elijah", "elijah-brooks", "Standards after dinner", "Trio format — guitar, upright, brushes. Table service stays open.", "solo", 14, 19, 30, 30.245, -97.7512, "C-Boy's Heart & Soul, 2008 S Congress Ave"),
  gig("gig-saxon-harper", "harper-quinn", "Sunday songwriter hour", "New songs, old stories, and the Saxon sound system being kind.", "solo", 24, 18, 0, 30.2553, -97.7633, "The Saxon Pub, 1320 S Lamar Blvd"),
  gig("gig-whitehorse-copper", "copper-notes", "Two-step Tuesday", "Dance lessons at 7, The Copper Notes at 8. Boots recommended.", "band", 26, 20, 0, 30.2625, -97.7258, "The White Horse, 500 Comal St"),
  gig("gig-parish-bassline", "bassline-society", "Club night: crates out", "Hip-hop and bounce until last call. 21+.", "dj", 31, 22, 30, 30.2672, -97.74, "Parish, 214 E 6th St"),
  gig("gig-hotelvegas-maya", "maya-chen", "East Side twilight", "Outdoor stage if the weather holds, inside if it doesn't.", "solo", 32, 19, 0, 30.2622, -97.7278, "Hotel Vegas, 1502 E 6th St"),
  gig("gig-cheerup-luna", "luna-park", "After hours at Cheer Up", "Minimal techno in the backyard. Starts late, ends later.", "dj", 41, 0, 30, 30.2694, -97.7365, "Cheer Up Charlies, 900 Red River St"),
  gig("gig-acl-velvet", "velvet-static", "Moody Theater warmup", "Special sit-down set before a touring bill. Limited GA.", "band", 42, 20, 0, 30.2653, -97.7472, "ACL Live at the Moody Theater, 310 W 2nd St"),
];

function gig(
  id: string,
  performerId: string,
  title: string,
  description: string,
  category: Category,
  dayOffset: number,
  hour: number,
  minute: number,
  lat: number,
  lng: number,
  label: string,
): SeedGig {
  return {
    id,
    performerId,
    title,
    description,
    category,
    dayOffset,
    hour,
    minute,
    location: { lat, lng, label },
  };
}

export function seedDatabase(now = new Date()): Database {
  const createdAt = now.toISOString();
  return {
    performers: SEED_PERFORMERS.map((performer) => ({ ...performer, createdAt })),
    gigs: SEED_GIGS.map((row) => {
      const timezone = lookupVenueTimeZone(row.location.lat, row.location.lng);
      return {
        id: row.id,
        performerId: row.performerId,
        title: row.title,
        description: row.description,
        category: row.category,
        datetime: venueOffsetIso(row.dayOffset, row.hour, row.minute, now, timezone),
        timezone,
        location: row.location,
        sourceUrl: null,
        sourceKind: null,
        createdAt,
      };
    }),
    bookings: [],
  };
}
