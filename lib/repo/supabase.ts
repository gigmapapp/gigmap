import "server-only";
import { CLIPS_BUCKET } from "@/lib/clips";
import { requireBookingPerformerId } from "@/lib/repo/booking-scope";
import type {
  BookingRepository,
  GigRepository,
  PerformerRepository,
} from "@/lib/repo/interface";
import { slugify } from "@/lib/slug";
import { getServiceClient } from "@/lib/supabase/server";
import type {
  BookingRequest,
  Category,
  CreateBookingInput,
  CreateGigInput,
  CreatePerformerInput,
  CreateVideoInput,
  Gig,
  Performer,
  Video,
} from "@/lib/types";

const PERFORMER_COLUMNS = "id, name, category, bio, city, genres, created_at";
const VIDEO_COLUMNS = "id, performer_id, title, source_type, url, created_at";
const GIG_COLUMNS = "id, performer_id, title, description, category, datetime, lat, lng, label, created_at";
const BOOKING_COLUMNS =
  "id, performer_id, contact_name, contact_email, event_details, preferred_date, preferred_location, message, status, created_at";

type PerformerRow = {
  id: string;
  name: string;
  category: Category;
  bio: string;
  city: string;
  genres: string[] | null;
  created_at: string;
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
  created_at: string;
};

type BookingRow = {
  id: string;
  performer_id: string;
  contact_name: string;
  contact_email: string;
  event_details: string;
  preferred_date: string;
  preferred_location: string;
  message: string;
  status: "pending";
  created_at: string;
};

function fail(error: { message: string; code?: string }, fallback: string): never {
  console.error(fallback, error.code ?? "", error.message);
  if (error.code === "23503") throw new Error("Performer not found");
  throw new Error(fallback);
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
  };
}

function toGig(row: GigRow): Gig {
  return {
    id: row.id,
    performerId: row.performer_id,
    title: row.title,
    description: row.description,
    category: row.category,
    datetime: row.datetime,
    location: {
      lat: row.lat,
      lng: row.lng,
      label: row.label,
    },
    createdAt: row.created_at,
  };
}

function toBooking(row: BookingRow): BookingRequest {
  return {
    id: row.id,
    performerId: row.performer_id,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    eventDetails: row.event_details,
    preferredDate: row.preferred_date,
    preferredLocation: row.preferred_location,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
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
  async create(input: CreatePerformerInput) {
    const base = slugify(input.name) || "performer";
    const payload = {
      name: input.name.trim(),
      category: input.category,
      bio: input.bio.trim(),
      city: input.city.trim() || "Austin, TX",
      genres: input.genres.map((genre) => genre.trim()).filter(Boolean),
    };
    for (let n = 1; n < 50; n += 1) {
      const id = n === 1 ? base : `${base}-${n}`;
      const { data, error } = await getServiceClient()
        .from("performers")
        .insert({ id, ...payload })
        .select(PERFORMER_COLUMNS)
        .maybeSingle();
      if (!error && data) return toPerformer(data as PerformerRow, []);
      if (error?.code !== "23505") fail(error ?? { message: "insert failed" }, "Could not create performer.");
    }
    throw new Error("Could not create performer.");
  },
  async addVideo(performerId, input: CreateVideoInput) {
    const { error } = await getServiceClient()
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
    };
    const { data, error } = await getServiceClient()
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
    const { data, error } = await getServiceClient()
      .from("booking_requests")
      .select(BOOKING_COLUMNS)
      .eq("performer_id", performerId)
      .order("created_at", { ascending: false });
    if (error) fail(error, "Could not load booking requests.");
    return ((data ?? []) as BookingRow[]).map(toBooking);
  },
  async create(input: CreateBookingInput) {
    const row = {
      id: crypto.randomUUID(),
      performer_id: input.performerId,
      contact_name: input.contactName.trim(),
      contact_email: input.contactEmail.trim(),
      event_details: input.eventDetails.trim(),
      preferred_date: input.preferredDate,
      preferred_location: input.preferredLocation.trim(),
      message: input.message.trim(),
      status: "pending",
    };
    const { data, error } = await getServiceClient()
      .from("booking_requests")
      .insert(row)
      .select(BOOKING_COLUMNS)
      .maybeSingle();
    if (error || !data) fail(error ?? { message: "insert failed" }, "Could not save booking request.");
    return toBooking(data as BookingRow);
  },
};

export async function createClipUploadTarget(input: {
  performerId: string;
  extension: string;
}): Promise<{ path: string; token: string; publicUrl: string }> {
  const path = `${input.performerId}/${crypto.randomUUID()}.${input.extension}`;
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
