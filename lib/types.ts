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

/** `owner` is a performer post. `public_info` is an unclaimed copy of a public listing. */
export type GigSourceKind = "owner" | "public_info";

export interface Gig {
  id: string;
  performerId: string;
  title: string;
  description: string;
  category: Category;
  /** UTC instant. Wall clock is `timezone`. */
  datetime: string;
  /**
   * IANA zone for this gig's wall clock, when the API sends one.
   * When it is missing, display derives a zone from lat/lng.
   * America/New_York is only used when the pin does not resolve.
   * The post form does not send this field. The server sets it from lat/lng on create.
   */
  timezone?: string | null;
  location: GeoLocation;
  /** Public page this listing was copied from. Null on owner posts. */
  sourceUrl: string | null;
  /**
   * `public_info` is listed from a public source and is not a claim.
   * `owner` is a performer post. Null is a legacy row and means owner.
   */
  sourceKind: GigSourceKind | null;
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
