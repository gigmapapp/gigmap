import type { ProfileUpdateColumns } from "@/lib/auth/profile-update";
import type {
  BookingDecisionStatus,
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
   * cannot be listed globally. `actorUserId` must own that performer; otherwise
   * the list is empty. Contact name and email stay on these rows.
   */
  list(filter: { performerId: string; actorUserId: string }): Promise<BookingRequest[]>;
  /** Requests this auth user sent. */
  listByRequester(requesterId: string): Promise<BookingRequest[]>;
  create(input: CreateBookingInput): Promise<BookingRequest>;
  /**
   * Accept, decline, or cancel. Returns null-safe before/after copies.
   * Throws BookingStatusError when the actor or the current status does not allow it.
   */
  setStatus(
    bookingId: string,
    actorUserId: string,
    status: BookingDecisionStatus,
  ): Promise<{ before: BookingRequest; after: BookingRequest }>;
}

export interface Repositories {
  performers: PerformerRepository;
  gigs: GigRepository;
  bookings: BookingRepository;
}
