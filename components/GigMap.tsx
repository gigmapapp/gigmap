"use client";

import { useEffect, useRef, useState } from "react";
import {
  GeoJSONSource,
  GeolocateControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import {
  CATEGORY_MARKER,
  DARK_MAP_STYLE,
  MYSTIC_CENTER,
} from "@/lib/map-style";
import { categoryLabel, formatGigWhen, zoneForGig } from "@/lib/format";
import { gigsWithinRadius } from "@/lib/nearby";
import {
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS_PX,
  POPUP_FIT_PADDING,
  maplibreWorkerUrl,
  mapViewPadding,
  pinsShareCoordinates,
  popupContentMaxHeight,
  popupPanBy,
  venuePinOffsets,
} from "@/lib/map-pins";
import {
  FAR_FROM_GIGS_HINT,
  locateVisitorForVisit,
  visitorSessionMemory,
  type GeoFlagStore,
  type VisitorVisitOutcome,
} from "@/lib/visitor-location";
import type { Category, Gig, Performer } from "@/lib/types";

type MapCenter = { lat: number; lng: number };

const MYSTIC: MapCenter = { lat: MYSTIC_CENTER.lat, lng: MYSTIC_CENTER.lng };
const GIG_SOURCE_ID = "gigs";

/**
 * Selectors QA can rely on:
 * - `.gig-marker` is one gig (category color on `--gig-marker`)
 * - `.gig-cluster` is a numbered group of nearby gigs
 */
if (typeof window !== "undefined") {
  setWorkerUrl(maplibreWorkerUrl(window.location.origin));
}

export type MappedGig = Gig & { performer: Performer | null };

export default function GigMap({
  gigs,
  selectedId,
  onSelect,
}: {
  gigs: MappedGig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const clustersRef = useRef<Map<string, Marker>>(new Map());
  const gigsRef = useRef(gigs);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const fittedRef = useRef<{ key: string; height: number } | null>(null);
  const centerRef = useRef<MapCenter>(MYSTIC);
  const loadedRef = useRef(false);
  const visitorRef = useRef<VisitorVisitOutcome | null>(null);
  const sourceKeyRef = useRef("");
  const renderGenRef = useRef(0);
  const overlayRef = useRef<Popup | null>(null);
  const [farHint, setFarHint] = useState(false);

  useEffect(() => {
    gigsRef.current = gigs;
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
  }, [gigs, selectedId, onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    const initialPad = mapViewPadding(container.clientWidth || 390, container.clientHeight || 320);
    const map = new MapLibreMap({
      container,
      style: DARK_MAP_STYLE,
      center: [MYSTIC.lng, MYSTIC.lat],
      zoom: MYSTIC_CENTER.zoom,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: false, timeout: 5_000, maximumAge: 0 },
        fitBoundsOptions: { maxZoom: MYSTIC_CENTER.zoom, duration: 800, padding: initialPad },
        trackUserLocation: false,
        showAccuracyCircle: false,
        showUserLocation: true,
      }),
      "top-right",
    );
    const nearMeObserver = labelNearMe(map);
    map.on("moveend", () => revealPopup(map));
    map.on("resize", () => {
      const maxWidth = popupMaxWidth(map);
      for (const marker of markersRef.current.values()) {
        marker.getPopup()?.setMaxWidth(maxWidth);
      }
      revealPopup(map);
    });
    const render = () => {
      void renderGigMarkers(map, {
        gigs: gigsRef.current,
        selectedId: selectedRef.current,
        onSelectRef,
        markersRef,
        clustersRef,
        renderGenRef,
        overlayRef,
      });
    };
    const publish = () => {
      publishGigSource(map, gigsRef.current, sourceKeyRef);
      render();
    };
    map.on("idle", render);
    map.on("moveend", render);
    map.on("sourcedata", (event) => {
      if (event.sourceId === GIG_SOURCE_ID && event.isSourceLoaded) render();
    });
    mapRef.current = map;
    const markers = markersRef.current;
    const clusters = clustersRef.current;
    let cancelled = false;
    const applyVisitor = () => {
      const outcome = visitorRef.current;
      if (!outcome || outcome.showFarHint) return;
      const next = { lat: outcome.camera.lat, lng: outcome.camera.lng };
      if (sameCenter(next, MYSTIC)) return;
      centerRef.current = next;
      fitAroundCenter(map, gigsRef.current, centerRef.current, fittedRef, true);
    };
    void automaticVisitOnce({
      permissions: typeof navigator === "undefined" ? null : navigator.permissions,
      geolocation: typeof navigator === "undefined" ? null : navigator.geolocation,
      storage: sessionStore(),
      memory: visitorSessionMemory(),
      gigs: () => gigsRef.current,
    }).then((outcome) => {
      if (cancelled) return;
      visitorRef.current = outcome;
      if (outcome.showFarHint) setFarHint(true);
      if (loadedRef.current) applyVisitor();
    });
    map.on("load", () => {
      loadedRef.current = true;
      // The container can change size while the style is loading (the desktop
      // column is flex-sized). Resize before placing markers so the camera
      // and pin positions share the final canvas. The first frame stays on
      // Mystic; a granted fix flies on the next frame.
      map.resize();
      publish();
      fitAroundCenter(map, gigsRef.current, centerRef.current, fittedRef, false);
      if (visitorRef.current) {
        requestAnimationFrame(() => {
          if (!cancelled) applyVisitor();
        });
      }
    });
    return () => {
      cancelled = true;
      renderGenRef.current += 1;
      nearMeObserver.disconnect();
      overlayRef.current?.remove();
      overlayRef.current = null;
      map.remove();
      mapRef.current = null;
      markers.clear();
      clusters.clear();
      fittedRef.current = null;
      loadedRef.current = false;
      sourceKeyRef.current = "";
      centerRef.current = MYSTIC;
      visitorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    publishGigSource(map, gigs, sourceKeyRef);
    void renderGigMarkers(map, {
      gigs,
      selectedId: selectedRef.current,
      onSelectRef,
      markersRef,
      clustersRef,
      renderGenRef,
      overlayRef,
    });

    let cancelled = false;
    const fit = () => {
      if (cancelled) return true;
      return fitAroundCenter(map, gigs, centerRef.current, fittedRef, false);
    };
    if (fit()) {
      return () => {
        cancelled = true;
      };
    }
    const observer = new ResizeObserver(() => {
      if (fit()) observer.disconnect();
    });
    observer.observe(map.getContainer());
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [gigs]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyPinSelection(map, markersRef.current, selectedId);
    const selected = gigs.find((gig) => gig.id === selectedId) ?? null;
    if (selected && !markersRef.current.has(selected.id)) {
      openOverlay(map, overlayRef, popupContent(selected), [selected.location.lng, selected.location.lat]);
    } else if (!selected) {
      overlayRef.current?.remove();
      overlayRef.current = null;
    }
    if (selected) {
      map.easeTo({
        center: [selected.location.lng, selected.location.lat],
        offset: [0, 40],
        duration: 450,
      });
    }
  }, [gigs, selectedId]);

  return (
    <div className="relative h-full min-h-0 w-full">
      <div ref={containerRef} className="h-full min-h-0 w-full" />
      {farHint ? (
        <div className="gig-far-hint pointer-events-none absolute top-2 left-2 z-10 flex w-max max-w-[calc(100%-4.75rem)] items-center gap-2 md:top-auto md:bottom-12 md:left-3 md:max-w-sm">
          <p
            role="status"
            aria-live="polite"
            className="min-w-0 flex-1 break-words rounded-lg border border-zinc-700 bg-zinc-950/95 px-3 py-2 text-xs leading-snug text-zinc-100 shadow-lg"
          >
            {FAR_FROM_GIGS_HINT}
          </p>
          <button
            type="button"
            className="pointer-events-auto inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-lg text-zinc-200 hover:bg-zinc-800"
            aria-label="Dismiss"
            onClick={() => setFarHint(false)}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** One automatic locate per document, so a strict-mode remount does not ask twice. */
let automaticVisit: Promise<VisitorVisitOutcome> | null = null;

function automaticVisitOnce(
  input: Parameters<typeof locateVisitorForVisit>[0],
): Promise<VisitorVisitOutcome> {
  if (!automaticVisit) automaticVisit = locateVisitorForVisit(input);
  return automaticVisit;
}

function sessionStore(): GeoFlagStore | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Frame gigs near the active center once the canvas has a real size.
 * A far outlier is left out of the bounds. With nothing nearby, the camera
 * stays on that center. Selecting a pin does not call this again. A later
 * resize from a not-yet-laid-out canvas (height under 50px) is allowed to refit.
 */
function fitAroundCenter(
  map: MapLibreMap,
  gigs: MappedGig[],
  center: MapCenter,
  fittedRef: { current: { key: string; height: number } | null },
  animate: boolean,
) {
  const el = map.getContainer();
  if (el.clientWidth < 2 || el.clientHeight < 2) return false;
  const nearby = gigsWithinRadius(gigs, center);
  const key = `${center.lat.toFixed(5)},${center.lng.toFixed(5)}|${nearby.map((gig) => gig.id).join("\n")}`;
  const previous = fittedRef.current;
  if (previous?.key === key && previous.height >= 50 && el.clientHeight >= 50) return true;
  map.resize();
  const padding = mapViewPadding(el.clientWidth, el.clientHeight);
  if (nearby.length > 0) {
    const bounds = new LngLatBounds();
    for (const gig of nearby) bounds.extend([gig.location.lng, gig.location.lat]);
    map.fitBounds(bounds, {
      padding,
      maxZoom: 14,
      duration: animate ? 800 : 0,
    });
  } else {
    const point = new LngLatBounds([center.lng, center.lat], [center.lng, center.lat]);
    map.fitBounds(point, {
      padding,
      maxZoom: MYSTIC_CENTER.zoom,
      duration: animate ? 800 : 0,
    });
  }
  fittedRef.current = { key, height: el.clientHeight };
  return true;
}

function sameCenter(current: { lat: number; lng: number }, center: MapCenter) {
  return Math.abs(current.lat - center.lat) < 1e-5 && Math.abs(current.lng - center.lng) < 1e-5;
}

/** Rename the locate button while it is enabled. A denied state keeps MapLibre's label. */
function labelNearMe(map: MapLibreMap) {
  const root = map.getContainer();
  const apply = () => {
    const button = root.querySelector(".maplibregl-ctrl-geolocate");
    if (!(button instanceof HTMLButtonElement) || button.disabled) return;
    if (button.getAttribute("aria-label") === "Near me") return;
    button.setAttribute("aria-label", "Near me");
    button.title = "Near me";
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["aria-label", "disabled", "class"],
  });
  return observer;
}

/** Cap the card so it can sit fully inside a narrow map. */
function popupMaxWidth(map: MapLibreMap) {
  const available = map.getContainer().clientWidth - 16;
  return `${Math.max(160, Math.min(260, available))}px`;
}

function popupOptions(map: MapLibreMap, closeOnClick: boolean) {
  return {
    anchor: "bottom" as const,
    offset: 28,
    closeButton: true,
    closeOnClick,
    focusAfterOpen: false,
    maxWidth: popupMaxWidth(map),
    padding: POPUP_FIT_PADDING,
  };
}

/** True while a corrective pan is in flight, so moveend does not pan again. */
let fittingPopup = false;

/** Keep popup bodies scrollable on a short map, then pan the open card fully inside. */
function revealPopup(map: MapLibreMap) {
  applyPopupScrollLimit(map);
  if (fittingPopup) return;
  const shift = popupShift(map);
  if (!shift) return;
  fittingPopup = true;
  try {
    map.panBy(shift, { duration: 0 });
  } finally {
    if (!map.isMoving()) fittingPopup = false;
    else map.once("moveend", () => {
      fittingPopup = false;
    });
  }
}

function schedulePopupFit(map: MapLibreMap) {
  revealPopup(map);
  requestAnimationFrame(() => revealPopup(map));
}

function applyPopupScrollLimit(map: MapLibreMap) {
  const max = popupContentMaxHeight(map.getContainer().clientWidth, map.getContainer().clientHeight);
  for (const node of map.getContainer().querySelectorAll(".gig-cluster-list, .gig-popup")) {
    if (!(node instanceof HTMLElement)) continue;
    if (max == null) {
      node.style.maxHeight = "";
      node.style.overflowY = "";
      continue;
    }
    node.style.maxHeight = `${max}px`;
    node.style.overflowY = "auto";
  }
}

function anchorPin(map: MapLibreMap): HTMLElement | null {
  const root = map.getContainer();
  const selected = root.querySelector('.gig-marker[data-selected="true"]');
  if (selected instanceof HTMLElement) return selected;
  const cluster = root.querySelector('.gig-cluster[aria-expanded="true"]');
  return cluster instanceof HTMLElement ? cluster : null;
}

function popupShift(map: MapLibreMap): [number, number] | null {
  const popup = map.getContainer().querySelector(".maplibregl-popup");
  if (!(popup instanceof HTMLElement)) return null;
  const mapRect = map.getContainer().getBoundingClientRect();
  const pop = popup.getBoundingClientRect();
  const pin = anchorPin(map)?.getBoundingClientRect() ?? null;
  return popupPanBy(mapRect, pop, pin);
}

type GigFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { id: string };
    geometry: { type: "Point"; coordinates: [number, number] };
  }>;
};

function gigsToGeoJSON(gigs: readonly MappedGig[]): GigFeatureCollection {
  return {
    type: "FeatureCollection",
    features: gigs.map((gig) => ({
      type: "Feature",
      properties: { id: gig.id },
      geometry: { type: "Point", coordinates: [gig.location.lng, gig.location.lat] },
    })),
  };
}

function publishGigSource(
  map: MapLibreMap,
  gigs: readonly MappedGig[],
  sourceKeyRef: { current: string },
) {
  if (!map.isStyleLoaded()) return;
  const key = gigs.map((gig) => gig.id).join("\n");
  const data = gigsToGeoJSON(gigs);
  const existing = map.getSource(GIG_SOURCE_ID) as GeoJSONSource | undefined;
  if (existing) {
    if (sourceKeyRef.current === key) return;
    sourceKeyRef.current = key;
    existing.setData(data);
    return;
  }
  sourceKeyRef.current = key;
  map.addSource(GIG_SOURCE_ID, {
    type: "geojson",
    data,
    cluster: true,
    clusterRadius: CLUSTER_RADIUS_PX,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
  });
  // The layers are invisible. They give the clustered source tiles to query.
  map.addLayer({
    id: "gigs-cluster-hit",
    type: "circle",
    source: GIG_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: { "circle-color": "#fc5a05", "circle-radius": 1, "circle-opacity": 0 },
  });
  map.addLayer({
    id: "gigs-point-hit",
    type: "circle",
    source: GIG_SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: { "circle-color": "#fc5a05", "circle-radius": 1, "circle-opacity": 0 },
  });
}

type RenderRefs = {
  gigs: readonly MappedGig[];
  selectedId: string | null;
  onSelectRef: { current: (id: string) => void };
  markersRef: { current: Map<string, Marker> };
  clustersRef: { current: Map<string, Marker> };
  renderGenRef: { current: number };
  overlayRef: { current: Popup | null };
};

async function renderGigMarkers(map: MapLibreMap, refs: RenderRefs) {
  if (!map.getSource(GIG_SOURCE_ID) || !map.isSourceLoaded(GIG_SOURCE_ID)) return;
  const gen = ++refs.renderGenRef.current;
  const features = map.querySourceFeatures(GIG_SOURCE_ID);
  const source = map.getSource(GIG_SOURCE_ID) as GeoJSONSource;
  const byId = new Map(refs.gigs.map((gig) => [gig.id, gig]));
  const offsets = venuePinOffsets(
    refs.gigs.map((gig) => ({ id: gig.id, lng: gig.location.lng, lat: gig.location.lat })),
  );

  type ClusterHit = { clusterId: number; count: number; lng: number; lat: number; gigIds: string[] };
  const clusters = new Map<number, ClusterHit>();
  const pins = new Map<string, { lng: number; lat: number }>();

  for (const feature of features) {
    const geometry = feature.geometry;
    if (geometry.type !== "Point") continue;
    const [lng, lat] = geometry.coordinates;
    const props = feature.properties ?? {};
    const count = Number(props.point_count);
    if (Number.isFinite(count) && count > 1) {
      const clusterId = Number(props.cluster_id);
      if (!Number.isFinite(clusterId) || clusters.has(clusterId)) continue;
      clusters.set(clusterId, { clusterId, count, lng, lat, gigIds: [] });
      continue;
    }
    const id = typeof props.id === "string" ? props.id : "";
    if (!id || pins.has(id) || !byId.has(id)) continue;
    pins.set(id, { lng, lat });
  }

  await Promise.all(
    [...clusters.values()].map(async (cluster) => {
      try {
        const leaves = await source.getClusterLeaves(cluster.clusterId, cluster.count, 0);
        cluster.gigIds = leaves
          .map((leaf) => {
            const id = leaf.properties?.id;
            return typeof id === "string" ? id : "";
          })
          .filter((id) => byId.has(id));
      } catch {
        cluster.gigIds = [];
      }
    }),
  );
  if (gen !== refs.renderGenRef.current) return;

  const keepPins = new Set(pins.keys());
  for (const [id, marker] of refs.markersRef.current) {
    if (!keepPins.has(id)) {
      marker.remove();
      refs.markersRef.current.delete(id);
    }
  }
  for (const [id, position] of pins) {
    const gig = byId.get(id);
    if (!gig) continue;
    const offset = offsets.get(id) ?? { x: 0, y: 0 };
    const existing = refs.markersRef.current.get(id);
    if (existing) {
      existing.setOffset([offset.x, offset.y]);
      existing.setLngLat([position.lng, position.lat]);
      continue;
    }
    refs.markersRef.current.set(id, createPinMarker(map, gig, position, offset, refs));
  }

  const keepClusters = new Set([...clusters.keys()].map(String));
  for (const [id, marker] of refs.clustersRef.current) {
    if (!keepClusters.has(id)) {
      marker.remove();
      refs.clustersRef.current.delete(id);
    }
  }
  for (const cluster of clusters.values()) {
    const key = String(cluster.clusterId);
    const existing = refs.clustersRef.current.get(key);
    if (existing) {
      existing.setLngLat([cluster.lng, cluster.lat]);
      const el = existing.getElement();
      el.textContent = String(cluster.count);
      el.dataset.gigIds = cluster.gigIds.join(" ");
      el.dataset.coincident = clusterIsCoincident(cluster.gigIds, byId) ? "true" : "false";
      el.setAttribute("aria-label", clusterLabel(cluster.count));
      continue;
    }
    refs.clustersRef.current.set(key, createClusterMarker(map, cluster, byId, refs));
  }

  applyPinSelection(map, refs.markersRef.current, refs.selectedId);
}

function clusterIsCoincident(ids: readonly string[], byId: Map<string, MappedGig>) {
  const points = ids.flatMap((id) => {
    const gig = byId.get(id);
    return gig ? [{ lng: gig.location.lng, lat: gig.location.lat }] : [];
  });
  return points.length >= 2 && pinsShareCoordinates(points);
}

function clusterLabel(count: number) {
  return `${count} gigs`;
}

function createPinMarker(
  map: MapLibreMap,
  gig: MappedGig,
  position: { lng: number; lat: number },
  offset: { x: number; y: number },
  refs: RenderRefs,
) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "gig-marker";
  el.style.setProperty("--gig-marker", CATEGORY_MARKER[gig.category] ?? "var(--accent)");
  el.dataset.gigId = gig.id;
  el.setAttribute("aria-label", `${gig.title}, ${gig.performer?.name ?? "Unknown"}`);
  el.setAttribute("aria-expanded", "false");

  const popup = new Popup(popupOptions(map, false)).setDOMContent(popupContent(gig));
  popup.on("open", () => schedulePopupFit(map));

  const activate = (event: Event) => {
    event.stopPropagation();
    refs.overlayRef.current?.remove();
    refs.overlayRef.current = null;
    refs.onSelectRef.current(gig.id);
    popup.setLngLat([position.lng, position.lat]);
    if (!popup.isOpen()) popup.addTo(map);
    else schedulePopupFit(map);
  };
  bindMapTap(el, activate);

  const marker = new Marker({ element: el, anchor: "center", offset: [offset.x, offset.y] })
    .setPopup(popup)
    .setLngLat([position.lng, position.lat])
    .addTo(map);
  if (gig.id === refs.selectedId) popup.addTo(map);
  return marker;
}

function createClusterMarker(
  map: MapLibreMap,
  cluster: { clusterId: number; count: number; lng: number; lat: number; gigIds: string[] },
  byId: Map<string, MappedGig>,
  refs: RenderRefs,
) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "gig-cluster";
  el.textContent = String(cluster.count);
  el.dataset.clusterId = String(cluster.clusterId);
  el.dataset.gigIds = cluster.gigIds.join(" ");
  el.dataset.coincident = clusterIsCoincident(cluster.gigIds, byId) ? "true" : "false";
  el.setAttribute("aria-label", clusterLabel(cluster.count));
  el.setAttribute("aria-expanded", "false");

  const activate = (event: Event) => {
    event.stopPropagation();
    void activateCluster(map, cluster.clusterId, [cluster.lng, cluster.lat], el, byId, refs);
  };
  bindMapTap(el, activate);

  return new Marker({ element: el, anchor: "center" })
    .setLngLat([cluster.lng, cluster.lat])
    .addTo(map);
}

async function activateCluster(
  map: MapLibreMap,
  clusterId: number,
  lngLat: [number, number],
  element: HTMLElement,
  byId: Map<string, MappedGig>,
  refs: RenderRefs,
) {
  const source = map.getSource(GIG_SOURCE_ID) as GeoJSONSource | undefined;
  if (!source) return;
  let gigIds = (element.dataset.gigIds ?? "").split(" ").filter(Boolean);
  if (gigIds.length === 0) {
    try {
      const leaves = await source.getClusterLeaves(clusterId, 100, 0);
      gigIds = leaves
        .map((leaf) => (typeof leaf.properties?.id === "string" ? leaf.properties.id : ""))
        .filter((id) => byId.has(id));
    } catch {
      gigIds = [];
    }
  }
  const gigs = gigIds.flatMap((id) => {
    const gig = byId.get(id);
    return gig ? [gig] : [];
  });
  const coincident = pinsShareCoordinates(
    gigs.map((gig) => ({ lng: gig.location.lng, lat: gig.location.lat })),
  );
  if (coincident && gigs.length >= 2) {
    openClusterList(map, gigs, lngLat, element, refs);
    return;
  }
  try {
    const zoom = await source.getClusterExpansionZoom(clusterId);
    if (!Number.isFinite(zoom) || zoom <= map.getZoom() + 0.01) {
      openClusterList(map, gigs, lngLat, element, refs);
      return;
    }
    element.setAttribute("aria-expanded", "false");
    map.easeTo({ center: lngLat, zoom, duration: 450 });
  } catch {
    openClusterList(map, gigs, lngLat, element, refs);
  }
}

function openClusterList(
  map: MapLibreMap,
  gigs: MappedGig[],
  lngLat: [number, number],
  element: HTMLElement,
  refs: RenderRefs,
) {
  element.setAttribute("aria-expanded", "true");
  const root = document.createElement("div");
  root.className = "gig-cluster-list";
  const kicker = document.createElement("p");
  kicker.className = "gig-popup-kicker";
  kicker.textContent = clusterLabel(gigs.length);
  root.append(kicker);
  const ordered = [...gigs].sort((a, b) => a.datetime.localeCompare(b.datetime));
  for (const gig of ordered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gig-cluster-item";
    button.textContent = `${gig.performer?.name ?? "Unknown"} — ${gig.title}`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      refs.onSelectRef.current(gig.id);
    });
    root.append(button);
  }
  openOverlay(map, refs.overlayRef, root, lngLat);
}

function openOverlay(
  map: MapLibreMap,
  overlayRef: { current: Popup | null },
  content: HTMLElement,
  lngLat: [number, number],
) {
  overlayRef.current?.remove();
  const popup = new Popup(popupOptions(map, true))
    .setDOMContent(content)
    .setLngLat(lngLat)
    .addTo(map);
  overlayRef.current = popup;
  popup.on("close", () => {
    if (overlayRef.current === popup) overlayRef.current = null;
  });
  schedulePopupFit(map);
}

function applyPinSelection(map: MapLibreMap, markers: Map<string, Marker>, selectedId: string | null) {
  for (const [id, marker] of markers) {
    const element = marker.getElement();
    const selected = id === selectedId;
    element.dataset.selected = selected ? "true" : "false";
    element.setAttribute("aria-expanded", selected ? "true" : "false");
    const popup = marker.getPopup();
    if (selected) {
      if (popup && !popup.isOpen()) {
        popup.setLngLat(marker.getLngLat());
        popup.addTo(map);
      }
    } else if (popup?.isOpen()) {
      popup.remove();
    }
  }
  if (selectedId) schedulePopupFit(map);
}

function bindMapTap(el: HTMLElement, activate: (event: Event) => void) {
  const keepGesture = (event: Event) => {
    event.stopPropagation();
  };
  el.addEventListener("pointerdown", keepGesture);
  el.addEventListener("mousedown", keepGesture);
  el.addEventListener("touchstart", keepGesture, { passive: true });
  el.addEventListener("touchend", (event) => {
    if (event.changedTouches.length !== 1) return;
    event.preventDefault();
    activate(event);
  });
  el.addEventListener("click", activate);
}

function popupContent(gig: MappedGig) {
  const root = document.createElement("div");
  root.className = "gig-popup";

  const kicker = document.createElement("p");
  kicker.className = "gig-popup-kicker";
  kicker.textContent = categoryLabel(gig.category);

  const title = document.createElement("p");
  title.className = "gig-popup-title";
  title.textContent = gig.title;

  const performer = document.createElement("p");
  performer.className = "gig-popup-performer";
  performer.textContent = gig.performer?.name ?? "Unknown";

  const when = document.createElement("p");
  when.className = "gig-popup-when";
  when.textContent = formatGigWhen(gig.datetime, zoneForGig(gig));

  const link = document.createElement("a");
  link.className = "gig-popup-link";
  link.href = `/gigs/${gig.id}`;
  link.textContent = "View gig";

  root.append(kicker, title, performer, when, link);
  return root;
}

export function categoryDot(category: Category) {
  return CATEGORY_MARKER[category];
}
