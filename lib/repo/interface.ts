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
  create(input: CreatePerformerInput): Promise<Performer>;
  addVideo(performerId: string, input: CreateVideoInput): Promise<Performer>;
}

export interface GigRepository {
  list(): Promise<Gig[]>;
  get(id: string): Promise<Gig | null>;
  create(input: CreateGigInput): Promise<Gig>;
}

export interface BookingRepository {
  list(filter?: { performerId?: string }): Promise<BookingRequest[]>;
  create(input: CreateBookingInput): Promise<BookingRequest>;
}

export interface Repositories {
  performers: PerformerRepository;
  gigs: GigRepository;
  bookings: BookingRepository;
}
