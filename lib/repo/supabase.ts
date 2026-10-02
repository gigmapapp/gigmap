import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bookingTargetError } from "@/lib/auth/access";
import { type ProfileUpdateColumns } from "@/lib/auth/profile-update";
import {
  BOOKING_MESSAGES,
  BookingStatusError,
  decideBookingTransition,
  parseBookingStatus,
} from "@/lib/bookings/status";
import { CLIPS_BUCKET, clipObjectPath } from "@/lib/clips";
import { requireBookingPerformerId } from "@/lib/repo/booking-scope";
import type {
  BookingRepository,
  GigRepository,
  PerformerRepository,
} from "@/lib/repo/interface";
import { slugify } from "@/lib/slug";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { getServiceClient } from "@/lib/supabase/server";
import type {
  BookingRequest,
  BookingStatus,
  Category,
  CreateBookingInput,
  CreateGigInput,
  CreatePerformerInput,
  CreateVideoInput,
  Gig,
  GigSourceKind,
  Performer,
  Video,
} from "@/lib/types";
import { lookupVenueTimeZone, readStoredSource, readStoredTimeZone } from "@/lib/venue-zone";

const PERFORMER_COLUMNS = "id, name, category, bio, city, genres, created_at, user_id";
const VIDEO_COLUMNS = "id, performer_id, title, source_type, url, created_at";
const GIG_COLUMNS =
  "id, performer_id, title, description, category, datetime, lat, lng, label, timezone, source_url, source_kind, created_at";
const BOOKING_COLUMNS =
  "id, performer_id, requester_id, contact_name, contact_email, event_details, preferred_date, preferred_location, message, status, created_at, status_changed_at";

type PerformerRow = {
  id: string;
  name: string;
  category: Category;
  bio: string;
  city: string;
  genres: string[] | null;
  created_at: string;
  user_id: string | null;
};

type VideoRow = {
  id: string;
  performer_id: string;
  title: string;
  source_type: Video["sourceType"];
  url: string;
  created_at: string;
};

type GigRow = {
  id: string;
  performer_id: string;
  title: string;
  description: string;
  category: Category;
  datetime: string;
  lat: number;
  lng: number;
  label: string;
  timezone: string | null;
  source_url: string | null;
  source_kind: GigSourceKind | null;
  created_at: string;
};

type BookingRow = {
  id: string;
  performer_id: string;
  requester_id: string | null;
  contact_name: string;
  contact_email: string;
  event_details: string;
  preferred_date: string;
  preferred_location: string;
  message: string;
  status: BookingStatus;
  created_at: string;
  status_changed_at: string;
};

function fail(error: { message: string; code?: string; details?: string }, fallback: string): never {
  console.error(fallback, error.code ?? "", error.message);
  if (error.code === "23503") throw new Error("Performer not found");
  if (error.code === "42501") throw new Error("You can only change your own profile.");
  const duplicate = `${error.message} ${error.details ?? ""}`;
  if (error.code === "23505" && /user_id/i.test(duplicate)) {
    throw new Error("You already have a performer profile.");
  }
  throw new Error(fallback);
}

/** Signed-in client. Writes through this client so RLS, not the service role, decides ownership. */
async function userDb(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = await createAuthServerClient();
  const { data, error } = await client.auth.getClaims();
  const userId = data?.claims.sub;
  if (error || !userId) throw new Error("Sign in to continue.");
  return { client, userId };
}

function toVideo(row: VideoRow): Video {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.source_type,
    url: row.url,
  };
}

function toPerformer(row: PerformerRow, videos: Video[]): Performer {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    bio: row.bio,
    city: row.city,
    genres: row.genres ?? [],
    videos,
    createdAt: row.created_at,
    claimed: row.user_id !== null,
  };
}

function toGig(row: GigRow): Gig {
  const source = readStoredSource(row.source_kind, row.source_url);
  return {
    id: row.id,
    performerId: row.performer_id,
    title: row.title,
    description: row.description,
    category: row.category,
    datetime: row.datetime,
    timezone: readStoredTimeZone(row.timezone, row.lat, row.lng),
    location: {
      lat: row.lat,
      lng: row.lng,
      label: row.label,
    },
    sourceUrl: source.sourceUrl,
    sourceKind: source.sourceKind,
    createdAt: row.created_at,
  };
}

function toBooking(row: BookingRow): BookingRequest {
  return {
    id: row.id,
    performerId: row.performer_id,
    requesterId: row.requester_id,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    eventDetails: row.event_details,
    preferredDate: row.preferred_date,
    preferredLocation: row.preferred_location,
    message: row.message,
    status: parseBookingStatus(row.status),
    createdAt: row.created_at,
    statusChangedAt: row.status_changed_at,
  };
}

async function videosFor(performerIds: string[]): Promise<Map<string, Video[]>> {
  const grouped = new Map<string, Video[]>();
  if (performerIds.length === 0) return grouped;
  const { data, error } = await getServiceClient()
    .from("videos")
    .select(VIDEO_COLUMNS)
    .in("performer_id", performerIds)
    .order("created_at", { ascending: true });
  if (error) fail(error, "Could not load clips.");
  for (const row of (data ?? []) as VideoRow[]) {
    const list = grouped.get(row.performer_id) ?? [];
    list.push(toVideo(row));
    grouped.set(row.performer_id, list);
  }
  return grouped;
}

async function performerById(id: string): Promise<Performer | null> {
  const { data, error } = await getServiceClient()
    .from("performers")
    .select(PERFORMER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error, "Could not load performer.");
  if (!data) return null;
  const videos = await videosFor([id]);
  return toPerformer(data as PerformerRow, videos.get(id) ?? []);
}

export const supabasePerformers: PerformerRepository = {
  async list() {
    const { data, error } = await getServiceClient().from("performers").select(PERFORMER_COLUMNS);
    if (error) fail(error, "Could not load performers.");
    const rows = (data ?? []) as PerformerRow[];
    const videos = await videosFor(rows.map((row) => row.id));
    return rows
      .map((row) => toPerformer(row, videos.get(row.id) ?? []))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  async get(id) {
    return performerById(id);
  },
  async getByUserId(userId) {
    if (!userId) return null;
    const { data, error } = await getServiceClient()
      .from("performers")
      .select(PERFORMER_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) fail(error, "Could not load performer.");
    if (!data) return null;
    const row = data as PerformerRow;
    const videos = await videosFor([row.id]);
    return toPerformer(row, videos.get(row.id) ?? []);
  },
  async create(input: CreatePerformerInput) {
    const { client, userId } = await userDb();
    if (input.userId !== userId) throw new Error("You can only create your own profile.");
    const base = slugify(input.name) || "performer";
    const payload = {
      name: input.name.trim(),
      category: input.category,
      bio: input.bio.trim(),
      city: input.city.trim(),
      genres: input.genres.map((genre) => genre.trim()).filter(Boolean),
      user_id: userId,
    };
    for (let n = 1; n < 50; n += 1) {
      const id = n === 1 ? base : `${base}-${n}`;
      const { data, error } = await client
        .from("performers")
        .insert({ id, ...payload })
        .select(PERFORMER_COLUMNS)
        .maybeSingle();
      if (!error && data) return toPerformer(data as PerformerRow, []);
      if (error?.code === "23505" && /user_id/i.test(`${error.message} ${error.details ?? ""}`)) {
        fail(error, "You already have a performer profile.");
      }
      if (error?.code !== "23505") fail(error ?? { message: "insert failed" }, "Could not create performer.");
    }
    throw new Error("Could not create performer.");
  },
  async update(performerId, actorUserId, input: ProfileUpdateColumns) {
    const { client, userId } = await userDb();
    if (actorUserId !== userId) return null;
    const payload = {
      name: input.name,
      category: input.category,
      bio: input.bio,
      city: input.city,
      genres: input.genres,
    };
    const { data, error } = await client
      .from("performers")
      .update(payload)
      .eq("id", performerId)
      .eq("user_id", userId)
      .select(PERFORMER_COLUMNS)
      .maybeSingle();
    if (error) fail(error, "Could not update profile.");
    if (!data) return null;
    const row = data as PerformerRow;
    const videos = await videosFor([row.id]);
    return toPerformer(row, videos.get(row.id) ?? []);
  },
  async addVideo(performerId, input: CreateVideoInput) {
    const { client } = await userDb();
    const { error } = await client
      .from("videos")
      .insert({
        id: crypto.randomUUID(),
        performer_id: performerId,
        title: input.title.trim() || "Untitled clip",
        source_type: input.sourceType,
        url: input.url,
      });
    if (error) fail(error, "Could not add clip.");
    const performer = await performerById(performerId);
    if (!performer) throw new Error("Performer not found");
    return performer;
  },
};

export const supabaseGigs: GigRepository = {
  async list() {
    const { data, error } = await getServiceClient()
      .from("gigs")
      .select(GIG_COLUMNS)
      .order("datetime", { ascending: true });
    if (error) fail(error, "Could not load gigs.");
    return ((data ?? []) as GigRow[]).map(toGig);
  },
  async get(id) {
    const { data, error } = await getServiceClient()
      .from("gigs")
      .select(GIG_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) fail(error, "Could not load gig.");
    return data ? toGig(data as GigRow) : null;
  },
  async create(input: CreateGigInput) {
    const row = {
      id: crypto.randomUUID(),
      performer_id: input.performerId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      datetime: input.datetime,
      lat: input.location.lat,
      lng: input.location.lng,
      label: input.location.label.trim(),
      timezone: lookupVenueTimeZone(input.location.lat, input.location.lng),
      source_url: null,
      source_kind: "owner" as const,
    };
    const { client } = await userDb();
    const { data, error } = await client
      .from("gigs")
      .insert(row)
      .select(GIG_COLUMNS)
      .maybeSingle();
    if (error || !data) fail(error ?? { message: "insert failed" }, "Could not post gig.");
    return toGig(data as GigRow);
  },
};

export const supabaseBookings: BookingRepository = {
  async list(filter) {
    const performerId = requireBookingPerformerId(filter.performerId);
    if (!filter.actorUserId) return [];
    const { client, userId } = await userDb();
    if (userId !== filter.actorUserId) return [];
    const owned = await client
      .from("performers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (owned.error) fail(owned.error, "Could not load booking requests.");
    if (!owned.data || owned.data.id !== performerId) return [];
    const { data, error } = await client
      .from("booking_requests")
      .select(BOOKING_COLUMNS)
      .eq("performer_id", performerId)
      .order("created_at", { ascending: false });
    if (error) fail(error, "Could not load booking requests.");
    return ((data ?? []) as BookingRow[]).map(toBooking);
  },
  async listByRequester(requesterId) {
    if (!requesterId) return [];
    const { client, userId } = await userDb();
    if (userId !== requesterId) return [];
    const { data, error } = await client
      .from("booking_requests")
      .select(BOOKING_COLUMNS)
      .eq("requester_id", requesterId)
      .order("created_at", { ascending: false });
    if (error) fail(error, "Could not load booking requests.");
    return ((data ?? []) as BookingRow[]).map(toBooking);
  },
  async create(input: CreateBookingInput) {
    const { client, userId } = await userDb();
    if (!input.requesterId || input.requesterId !== userId) {
      throw new Error(BOOKING_MESSAGES.signIn);
    }
    const performer = await client
      .from("performers")
      .select("id, user_id")
      .eq("id", input.performerId)
      .maybeSingle();
    if (performer.error) fail(performer.error, "Could not load performer.");
    const refusal = bookingTargetError(
      performer.data ? { claimed: performer.data.user_id !== null } : null,
    );
    if (refusal) throw new Error(refusal);
    const row = {
      id: crypto.randomUUID(),
      performer_id: input.performerId,
      requester_id: userId,
      contact_name: input.contactName.trim(),
      contact_email: input.contactEmail.trim(),
      event_details: input.eventDetails.trim(),
      preferred_date: input.preferredDate,
      preferred_location: input.preferredLocation.trim(),
      message: input.message.trim(),
      status: "pending" as const,
    };
    const { data, error } = await client
      .from("booking_requests")
      .insert(row)
      .select(BOOKING_COLUMNS)
      .maybeSingle();
    if (error?.code === "42501") throw new Error(BOOKING_MESSAGES.signIn);
    if (error || !data) fail(error ?? { message: "insert failed" }, "Could not save booking request.");
    return toBooking(data as BookingRow);
  },
  async setStatus(bookingId, actorUserId, status) {
    const { client, userId } = await userDb();
    if (!actorUserId || actorUserId !== userId) {
      throw new BookingStatusError(BOOKING_MESSAGES.signInUpdate);
    }
    const existing = await client
      .from("booking_requests")
      .select(BOOKING_COLUMNS)
      .eq("id", bookingId)
      .maybeSingle();
    if (existing.error) fail(existing.error, BOOKING_MESSAGES.updateFailed);
    if (!existing.data) throw new BookingStatusError(BOOKING_MESSAGES.unavailable);
    const before = toBooking(existing.data as BookingRow);
    const performer = await client
      .from("performers")
      .select("user_id")
      .eq("id", before.performerId)
      .maybeSingle();
    if (performer.error) fail(performer.error, BOOKING_MESSAGES.updateFailed);
    const decision = decideBookingTransition({
      actorUserId: userId,
      ownerUserId: performer.data?.user_id ?? null,
      requesterId: before.requesterId,
      fromStatus: before.status,
      toStatus: status,
    });
    if (!decision.ok) throw new BookingStatusError(decision.message);
    const updated = await client
      .from("booking_requests")
      .update({ status })
      .eq("id", bookingId)
      .select(BOOKING_COLUMNS)
      .maybeSingle();
    if (updated.error) {
      console.error("Booking status update rejected.", updated.error.code ?? "", updated.error.message);
      throw new BookingStatusError(BOOKING_MESSAGES.unchanged);
    }
    if (!updated.data) throw new BookingStatusError(BOOKING_MESSAGES.unchanged);
    return { before, after: toBooking(updated.data as BookingRow) };
  },
};

export async function createClipUploadTarget(input: {
  performerId: string;
  extension: string;
  ownerUserId: string;
}): Promise<{ path: string; token: string; publicUrl: string }> {
  if (!input.ownerUserId) throw new Error("Sign in to upload a clip.");
  const { data, error } = await getServiceClient()
    .from("performers")
    .select("id, user_id")
    .eq("id", input.performerId)
    .maybeSingle();
  if (error) fail(error, "Could not load performer.");
  if (!data || data.user_id !== input.ownerUserId) {
    throw new Error("You can only upload clips for your own profile.");
  }
  const path = clipObjectPath(input.performerId, input.extension);
  const supabase = getServiceClient();
  const signed = await supabase.storage.from(CLIPS_BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data) {
    throw new Error(signed.error?.message || "Could not start the clip upload.");
  }
  const { data: pub } = supabase.storage.from(CLIPS_BUCKET).getPublicUrl(signed.data.path);
  return {
    path: signed.data.path,
    token: signed.data.token,
    publicUrl: pub.publicUrl,
  };
}
