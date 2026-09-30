import type { ProfileUpdateColumns } from "@/lib/auth/profile-update";
import type {
  BookingRequest,
  CreateBookingInput,
  CreateGigInput,
  CreatePerformerInput,
  CreateVideoInput,
  Gig,
  Performer,
} from "@/lib/types";

export interface PerformerRepository {
  list(): Promise<Performer[]>;
  get(id: string): Promise<Performer | null>;
  /** Profile owned by this auth user, if they have finished onboarding. */
  getByUserId(userId: string): Promise<Performer | null>;
  create(input: CreatePerformerInput): Promise<Performer>;
  /**
   * Updates name, category, bio, city, and genres for a row owned by
   * actorUserId. Returns null when that user does not own the row.
   * Does not change id or user_id.
   */
  update(performerId: string, actorUserId: string, input: ProfileUpdateColumns): Promise<Performer | null>;
  addVideo(performerId: string, input: CreateVideoInput): Promise<Performer>;
}

export interface GigRepository {
  list(): Promise<Gig[]>;
  get(id: string): Promise<Gig | null>;
  /**
   * Stores the UTC instant from `input.datetime` and sets `timezone` from the
   * venue lat/lng. There is no timezone field on the input.
   */
  create(input: CreateGigInput): Promise<Gig>;
}

export interface BookingRepository {
  /**
   * Requests sent to one performer. `performerId` is required so an inbox
   * cannot be listed globally. Contact name and email stay on these rows.
   */
  list(filter: { performerId: string }): Promise<BookingRequest[]>;
  create(input: CreateBookingInput): Promise<BookingRequest>;
}

export interface Repositories {
  performers: PerformerRepository;
  gigs: GigRepository;
  bookings: BookingRepository;
}
