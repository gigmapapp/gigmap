import "server-only";
import type { ProfileUpdateColumns } from "@/lib/auth/profile-update";
import type {
  CreateGigInput,
  CreatePerformerInput,
  CreateVideoInput,
} from "@/lib/types";
import type { BookingRepository, GigRepository, PerformerRepository, Repositories } from "@/lib/repo/interface";
import { jsonBookings, jsonGigs, jsonPerformers } from "@/lib/repo/json";
import { supabaseBookings, supabaseGigs, supabasePerformers } from "@/lib/repo/supabase";
import { clipUploadMode, isSupabaseConfigured } from "@/lib/supabase/env";

function repositories(): Repositories {
  if (isSupabaseConfigured()) {
    return {
      performers: supabasePerformers,
      gigs: supabaseGigs,
      bookings: supabaseBookings,
    };
  }
  return {
    performers: jsonPerformers,
    gigs: jsonGigs,
    bookings: jsonBookings,
  };
}

export const performers: PerformerRepository = {
  list: () => repositories().performers.list(),
  get: (id) => repositories().performers.get(id),
  getByUserId: (userId) => repositories().performers.getByUserId(userId),
  create: (input: CreatePerformerInput) => repositories().performers.create(input),
  update: (performerId: string, actorUserId: string, input: ProfileUpdateColumns) =>
    repositories().performers.update(performerId, actorUserId, input),
  addVideo: (performerId, input: CreateVideoInput) => repositories().performers.addVideo(performerId, input),
};

export const gigs: GigRepository = {
  list: () => repositories().gigs.list(),
  get: (id) => repositories().gigs.get(id),
  create: (input: CreateGigInput) => repositories().gigs.create(input),
};

export const bookings: BookingRepository = {
  list: (filter) => repositories().bookings.list(filter),
  listByRequester: (requesterId) => repositories().bookings.listByRequester(requesterId),
  create: (input) => repositories().bookings.create(input),
  setStatus: (bookingId, actorUserId, status) =>
    repositories().bookings.setStatus(bookingId, actorUserId, status),
};

export { clipUploadMode, isSupabaseConfigured };
