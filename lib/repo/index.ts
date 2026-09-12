import type { Repositories } from "@/lib/repo/interface";
import { jsonBookings, jsonGigs, jsonPerformers } from "@/lib/repo/json";

export const repo: Repositories = {
  performers: jsonPerformers,
  gigs: jsonGigs,
  bookings: jsonBookings,
};

export const performers = jsonPerformers;
export const gigs = jsonGigs;
export const bookings = jsonBookings;
