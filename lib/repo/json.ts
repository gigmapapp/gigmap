import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedDatabase } from "@/lib/seed/austin";
import type {
  BookingRequest,
  CreateBookingInput,
  CreateGigInput,
  CreatePerformerInput,
  CreateVideoInput,
  Database,
  Gig,
  Performer,
} from "@/lib/types";
import type {
  BookingRepository,
  GigRepository,
  PerformerRepository,
} from "@/lib/repo/interface";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

let writeChain: Promise<unknown> = Promise.resolve();
let initialized: Promise<void> | null = null;

async function persist(db: Database) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await rename(tmp, DB_PATH);
}

function parseDb(raw: string): Database {
  const parsed = JSON.parse(raw) as Database;
  if (!parsed.performers || !parsed.gigs || !parsed.bookings) {
    throw new Error("Incomplete store");
  }
  return parsed;
}

async function initialize() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    parseDb(await readFile(DB_PATH, "utf8"));
  } catch {
    await persist(seedDatabase());
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

export async function readDb(): Promise<Database> {
  await ensureInitialized();
  try {
    return parseDb(await readFile(DB_PATH, "utf8"));
  } catch {
    initialized = null;
    await ensureInitialized();
    return parseDb(await readFile(DB_PATH, "utf8"));
  }
}

async function updateDb<T>(mutator: (db: Database) => T): Promise<T> {
  const run = writeChain.then(async () => {
    const db = await readDb();
    const result = mutator(db);
    await persist(db);
    return result;
  });
  writeChain = run.catch(() => undefined);
  return run;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export const jsonPerformers: PerformerRepository = {
  async list() {
    const db = await readDb();
    return [...db.performers].sort((a, b) => a.name.localeCompare(b.name));
  },
  async get(id) {
    const db = await readDb();
    return db.performers.find((performer) => performer.id === id) ?? null;
  },
  async create(input: CreatePerformerInput) {
    return updateDb((db) => {
      const base = slugify(input.name) || "performer";
      let id = base;
      let n = 2;
      while (db.performers.some((performer) => performer.id === id)) {
        id = `${base}-${n}`;
        n += 1;
      }
      const performer: Performer = {
        id,
        name: input.name.trim(),
        category: input.category,
        bio: input.bio.trim(),
        city: input.city.trim() || "Austin, TX",
        genres: input.genres.map((genre) => genre.trim()).filter(Boolean),
        videos: [],
        createdAt: new Date().toISOString(),
      };
      db.performers.push(performer);
      return performer;
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
      return performer;
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
        location: {
          lat: input.location.lat,
          lng: input.location.lng,
          label: input.location.label.trim(),
        },
        createdAt: new Date().toISOString(),
      };
      db.gigs.push(gig);
      return gig;
    });
  },
};

export const jsonBookings: BookingRepository = {
  async list(filter) {
    const db = await readDb();
    const rows = filter?.performerId
      ? db.bookings.filter((booking) => booking.performerId === filter.performerId)
      : db.bookings;
    return [...rows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },
  async create(input: CreateBookingInput) {
    return updateDb((db) => {
      if (!db.performers.some((performer) => performer.id === input.performerId)) {
        throw new Error("Performer not found");
      }
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
