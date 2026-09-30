export const CATEGORIES = ["solo", "band", "dj"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Video {
  id: string;
  title: string;
  sourceType: "url" | "upload";
  url: string;
}

export interface Performer {
  id: string;
  name: string;
  category: Category;
  bio: string;
  city: string;
  genres: string[];
  videos: Video[];
  createdAt: string;
  /**
   * True when performers.user_id is set. Seed rows stay false: public demo
   * profiles that nobody can edit or receive bookings for.
   */
  claimed: boolean;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface Gig {
  id: string;
  performerId: string;
  title: string;
  description: string;
  category: Category;
  datetime: string;
  location: GeoLocation;
  createdAt: string;
}

export interface BookingRequest {
  id: string;
  performerId: string;
  contactName: string;
  contactEmail: string;
  eventDetails: string;
  preferredDate: string;
  preferredLocation: string;
  message: string;
  status: "pending";
  createdAt: string;
}

export interface Database {
  performers: Performer[];
  gigs: Gig[];
  bookings: BookingRequest[];
}

export interface CreatePerformerInput {
  name: string;
  category: Category;
  bio: string;
  city: string;
  genres: string[];
  /** Auth user id. The Supabase adapter checks this against the session. */
  userId: string;
}

export interface CreateGigInput {
  performerId: string;
  title: string;
  description: string;
  category: Category;
  datetime: string;
  location: GeoLocation;
}

export interface CreateBookingInput {
  performerId: string;
  contactName: string;
  contactEmail: string;
  eventDetails: string;
  preferredDate: string;
  preferredLocation: string;
  message: string;
}

export interface CreateVideoInput {
  title: string;
  sourceType: "url" | "upload";
  url: string;
}
