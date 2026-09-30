import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { bookingTargetError } from "@/lib/auth/access";
import { updateOwnedPerformer, type ProfileUpdateColumns } from "@/lib/auth/profile-update";
import { seedDatabase } from "@/lib/seed/database";
import type {
  BookingRequest,
  CreateBookingInput,
  CreateGigInput,
  CreatePerformerInput,
  CreateVideoInput,
  Gig,
  Performer,
} from "@/lib/types";
import { requireBookingPerformerId } from "@/lib/repo/booking-scope";
import type {
  BookingRepository,
  GigRepository,
  PerformerRepository,
} from "@/lib/repo/interface";
import { slugify } from "@/lib/slug";
import { lookupVenueTimeZone, readStoredSource, readStoredTimeZone } from "@/lib/venue-zone";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

type StoredPerformer = Omit<Performer, "claimed"> & {
  userId: string | null;
  claimed?: boolean;
};

type StoredDatabase = {
  performers: StoredPerformer[];
  gigs: Gig[];
  bookings: BookingRequest[];
};

function toPerformer(row: StoredPerformer): Performer {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    bio: row.bio,
    city: row.city,
    genres: row.genres ?? [],
    videos: row.videos ?? [],
    createdAt: row.createdAt,
    claimed: Boolean(row.userId),
  };
}

let writeChain: Promise<unknown> = Promise.resolve();
let initialized: Promise<void> | null = null;

async function persist(db: StoredDatabase) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await rename(tmp, DB_PATH);
}

function parseDb(raw: string): StoredDatabase {
  const parsed = JSON.parse(raw) as StoredDatabase;
  if (!parsed.performers || !parsed.gigs || !parsed.bookings) {
    throw new Error("Incomplete store");
  }
  return {
    performers: parsed.performers.map((row) => ({
      ...row,
      userId: row.userId ?? null,
      videos: row.videos ?? [],
    })),
    gigs: parsed.gigs.map((gig) => {
      const source = readStoredSource(gig.sourceKind, gig.sourceUrl);
      return {
        ...gig,
        timezone: readStoredTimeZone(gig.timezone, gig.location.lat, gig.location.lng),
        sourceUrl: source.sourceUrl,
        sourceKind: source.sourceKind,
      };
    }),
    bookings: parsed.bookings,
  };
}

async function initialize() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    parseDb(await readFile(DB_PATH, "utf8"));
  } catch {
    const seeded = seedDatabase();
    await persist({
      performers: seeded.performers.map((performer) => ({ ...performer, userId: null })),
      gigs: seeded.gigs,
      bookings: seeded.bookings,
    });
  }
}

function ensureInitialized() {
  if (!initialized) {
    initialized = initialize().catch((error) => {
      initialized = null;
      throw error;
    });
  }
  return initialized;
}

export async function readDb(): Promise<StoredDatabase> {
  await ensureInitialized();
  try {
    return parseDb(await readFile(DB_PATH, "utf8"));
  } catch {
    initialized = null;
    await ensureInitialized();
    return parseDb(await readFile(DB_PATH, "utf8"));
  }
}

async function updateDb<T>(mutator: (db: StoredDatabase) => T): Promise<T> {
  const run = writeChain.then(async () => {
    const db = await readDb();
    const result = mutator(db);
    await persist(db);
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

export const jsonPerformers: PerformerRepository = {
  async list() {
    const db = await readDb();
    return db.performers.map(toPerformer).sort((a, b) => a.name.localeCompare(b.name));
  },
  async get(id) {
    const db = await readDb();
    const row = db.performers.find((performer) => performer.id === id);
    return row ? toPerformer(row) : null;
  },
  async getByUserId(userId) {
    if (!userId) return null;
    const db = await readDb();
    const row = db.performers.find((performer) => performer.userId === userId);
    return row ? toPerformer(row) : null;
  },
  async create(input: CreatePerformerInput) {
    const userId = input.userId.trim();
    if (!userId) throw new Error("Sign in to create a profile.");
    return updateDb((db) => {
      if (db.performers.some((performer) => performer.userId === userId)) {
        throw new Error("You already have a performer profile.");
      }
      const base = slugify(input.name) || "performer";
      let id = base;
      let n = 2;
      while (db.performers.some((performer) => performer.id === id)) {
        id = `${base}-${n}`;
        n += 1;
      }
      const row: StoredPerformer = {
        id,
        name: input.name.trim(),
        category: input.category,
        bio: input.bio.trim(),
        city: input.city.trim(),
        genres: input.genres.map((genre) => genre.trim()).filter(Boolean),
        videos: [],
        createdAt: new Date().toISOString(),
        userId,
      };
      db.performers.push(row);
      return toPerformer(row);
    });
  },
  async update(performerId, actorUserId, input: ProfileUpdateColumns) {
    return updateDb((db) => {
      const outcome = updateOwnedPerformer(
        db.performers.map((row) => ({
          id: row.id,
          userId: row.userId,
          name: row.name,
          category: row.category,
          bio: row.bio,
          city: row.city,
          genres: row.genres ?? [],
        })),
        actorUserId,
        performerId,
        input,
      );
      if (!outcome.updated) return null;
      const next = outcome.rows.find((row) => row.id === performerId);
      const stored = db.performers.find((row) => row.id === performerId);
      if (!next || !stored) return null;
      stored.name = next.name;
      stored.category = next.category;
      stored.bio = next.bio;
      stored.city = next.city;
      stored.genres = next.genres;
      return toPerformer(stored);
    });
  },
  async addVideo(performerId, input: CreateVideoInput) {
    return updateDb((db) => {
      const performer = db.performers.find((item) => item.id === performerId);
      if (!performer) {
        throw new Error("Performer not found");
      }
      performer.videos.push({
        id: crypto.randomUUID(),
        title: input.title.trim() || "Untitled clip",
        sourceType: input.sourceType,
        url: input.url,
      });
      return toPerformer(performer);
    });
  },
};

export const jsonGigs: GigRepository = {
  async list() {
    const db = await readDb();
    return [...db.gigs].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
    );
  },
  async get(id) {
    const db = await readDb();
    return db.gigs.find((gig) => gig.id === id) ?? null;
  },
  async create(input: CreateGigInput) {
    return updateDb((db) => {
      const gig: Gig = {
        id: crypto.randomUUID(),
        performerId: input.performerId,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        datetime: input.datetime,
        timezone: lookupVenueTimeZone(input.location.lat, input.location.lng),
        location: {
          lat: input.location.lat,
          lng: input.location.lng,
          label: input.location.label.trim(),
        },
        sourceUrl: null,
        sourceKind: "owner",
        createdAt: new Date().toISOString(),
      };
      db.gigs.push(gig);
      return gig;
    });
  },
};

export const jsonBookings: BookingRepository = {
  async list(filter) {
    const performerId = requireBookingPerformerId(filter.performerId);
    const db = await readDb();
    const rows = db.bookings.filter((booking) => booking.performerId === performerId);
    return [...rows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },
  async create(input: CreateBookingInput) {
    return updateDb((db) => {
      const performer = db.performers.find((item) => item.id === input.performerId);
      const refusal = bookingTargetError(performer ? toPerformer(performer) : null);
      if (refusal) throw new Error(refusal);
      const booking: BookingRequest = {
        id: crypto.randomUUID(),
        performerId: input.performerId,
        contactName: input.contactName.trim(),
        contactEmail: input.contactEmail.trim(),
        eventDetails: input.eventDetails.trim(),
        preferredDate: input.preferredDate,
        preferredLocation: input.preferredLocation.trim(),
        message: input.message.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      db.bookings.push(booking);
      return booking;
    });
  },
};
