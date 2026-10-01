import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Files the module worker imports. Keep them beside each other. */
export const MAPLIBRE_WORKER_FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

/**
 * MapLibre's default worker URL is empty unless `import.meta.url` is http(s).
 * Next bundles the library so that check fails and `new Worker('')` loads the page.
 * Serve the real worker (and the module it imports) from `public/` instead.
 */
export function copyMaplibreWorker() {
  const dist = path.join(root, "node_modules", "maplibre-gl", "dist");
  const dest = path.join(root, "public", "maplibre");
  mkdirSync(dest, { recursive: true });
  for (const name of MAPLIBRE_WORKER_FILES) {
    copyFileSync(path.join(dist, name), path.join(dest, name));
  }
}

copyMaplibreWorker();
