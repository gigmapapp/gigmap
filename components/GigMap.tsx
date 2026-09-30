"use client";

import { useEffect, useRef } from "react";
import {
  GeolocateControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
} from "maplibre-gl";
import {
  CATEGORY_MARKER,
  DARK_MAP_STYLE,
  MYSTIC_CENTER,
} from "@/lib/map-style";
import { categoryLabel, formatGigWhen } from "@/lib/format";
import { gigsWithinRadius } from "@/lib/nearby";
import { requestVisitorLocation, type VisitorLocationResult } from "@/lib/visitor-location";
import type { Category, Gig, Performer } from "@/lib/types";

type MapCenter = { lat: number; lng: number };

const MYSTIC: MapCenter = { lat: MYSTIC_CENTER.lat, lng: MYSTIC_CENTER.lng };

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
  const gigsRef = useRef(gigs);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const fittedRef = useRef<{ key: string; height: number } | null>(null);
  const centerRef = useRef<MapCenter>(MYSTIC);
  const loadedRef = useRef(false);
  const visitorRef = useRef<VisitorLocationResult | null>(null);

  useEffect(() => {
    gigsRef.current = gigs;
    selectedRef.current = selectedId;
    onSelectRef.current = onSelect;
  }, [gigs, selectedId, onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: DARK_MAP_STYLE,
      center: [MYSTIC.lng, MYSTIC.lat],
      zoom: MYSTIC_CENTER.zoom,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: false, timeout: 5_000, maximumAge: 0 },
        fitBoundsOptions: { maxZoom: MYSTIC_CENTER.zoom, duration: 800 },
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
    mapRef.current = map;
    const markers = markersRef.current;
    let cancelled = false;
    const sync = () => {
      syncMarkers(map, gigsRef.current, selectedRef.current, onSelectRef, markersRef);
    };
    const applyVisitor = () => {
      const result = visitorRef.current;
      if (!result || result.status !== "granted") return;
      centerRef.current = { lat: result.lat, lng: result.lng };
      fitAroundCenter(map, gigsRef.current, centerRef.current, fittedRef, true);
    };
    void requestVisitorLocation(
      typeof navigator === "undefined" ? null : navigator.geolocation,
    ).then((result) => {
      if (cancelled) return;
      visitorRef.current = result;
      if (loadedRef.current) applyVisitor();
    });
    map.on("load", () => {
      loadedRef.current = true;
      // The container can change size while the style is loading (the desktop
      // column is flex-sized). Resize before placing markers so the camera
      // and pin positions share the final canvas. The first frame stays on
      // Mystic; a granted fix flies on the next frame.
      map.resize();
      sync();
      fitAroundCenter(map, gigsRef.current, centerRef.current, fittedRef, false);
      if (visitorRef.current?.status === "granted") {
        requestAnimationFrame(() => {
          if (!cancelled) applyVisitor();
        });
      }
    });
    return () => {
      cancelled = true;
      nearMeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      markers.clear();
      fittedRef.current = null;
      loadedRef.current = false;
      centerRef.current = MYSTIC;
      visitorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncMarkers(map, gigs, selectedRef.current, onSelectRef, markersRef);

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
    for (const [id, marker] of markersRef.current) {
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
    const selected = gigs.find((gig) => gig.id === selectedId);
    if (selected) {
      map.easeTo({
        center: [selected.location.lng, selected.location.lat],
        offset: [0, 40],
        duration: 450,
      });
    }
  }, [gigs, selectedId]);

  return <div ref={containerRef} className="h-full min-h-0 w-full" />;
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
  if (nearby.length > 0) {
    const bounds = new LngLatBounds();
    for (const gig of nearby) bounds.extend([gig.location.lng, gig.location.lat]);
    const wide = el.clientWidth >= 768;
    const maxPad = Math.max(16, el.clientHeight * 0.4);
    const top = Math.min(wide ? Math.round(el.clientHeight * 0.3) : 24, maxPad);
    const side = Math.min(wide ? 48 : 24, maxPad);
    map.fitBounds(bounds, {
      padding: { top, right: side, bottom: side, left: side },
      maxZoom: 14,
      duration: animate ? 800 : 0,
    });
  } else if (!sameCenter(map.getCenter(), center)) {
    const camera = { center: [center.lng, center.lat] as [number, number], zoom: MYSTIC_CENTER.zoom };
    if (animate) map.flyTo({ ...camera, duration: 800 });
    else map.jumpTo(camera);
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

/** True while a corrective pan is in flight, so moveend does not pan again. */
let fittingPopup = false;

/**
 * On a phone-width map, pan just enough that an open popup is inside the
 * canvas. Dynamic anchors cover a pin near the edge; this covers a pin that
 * has been panned past the edge, where anchoring alone still clips the card.
 * Wider maps keep the existing camera behavior.
 */
function revealPopup(map: MapLibreMap) {
  if (fittingPopup || map.getContainer().clientWidth >= 768) return;
  const shift = popupShift(map);
  if (!shift) return;
  fittingPopup = true;
  const release = () => {
    fittingPopup = false;
  };
  map.once("moveend", () => {
    const again = popupShift(map);
    if (!again) {
      release();
      return;
    }
    map.once("moveend", release);
    map.panBy(again, { duration: 0 });
    if (!map.isMoving()) release();
  });
  map.panBy(shift, { duration: 220 });
  if (!map.isMoving()) release();
}

function popupShift(map: MapLibreMap): [number, number] | null {
  const popup = map.getContainer().querySelector(".maplibregl-popup");
  if (!(popup instanceof HTMLElement)) return null;
  const mapRect = map.getContainer().getBoundingClientRect();
  const pop = popup.getBoundingClientRect();
  if (pop.width < 1 || pop.height < 1) return null;
  const marker = map.getContainer().querySelector('.gig-marker[data-selected="true"]');
  const pin = marker?.getBoundingClientRect();
  const left = pin ? Math.min(pop.left, pin.left) : pop.left;
  const right = pin ? Math.max(pop.right, pin.right) : pop.right;
  const top = pin ? Math.min(pop.top, pin.top) : pop.top;
  const bottom = pin ? Math.max(pop.bottom, pin.bottom) : pop.bottom;
  const margin = 8;
  const overflowLeft = mapRect.left + margin - left;
  const overflowRight = right - (mapRect.right - margin);
  const overflowTop = mapRect.top + margin - top;
  const overflowBottom = bottom - (mapRect.bottom - margin);
  const tooWide = right - left > mapRect.width - margin * 2;
  const tooTall = bottom - top > mapRect.height - margin * 2;
  let x = 0;
  let y = 0;
  if (overflowLeft > 1) x = -overflowLeft;
  else if (!tooWide && overflowRight > 1) x = overflowRight;
  if (overflowTop > 1) y = -overflowTop;
  else if (!tooTall && overflowBottom > 1) y = overflowBottom;
  if (Math.abs(x) < 1 && Math.abs(y) < 1) return null;
  return [x, y];
}

function syncMarkers(
  map: MapLibreMap,
  gigs: MappedGig[],
  selectedId: string | null,
  onSelectRef: { current: (id: string) => void },
  markersRef: { current: Map<string, Marker> },
) {
  const keep = new Set(gigs.map((gig) => gig.id));
  for (const [id, marker] of markersRef.current) {
    if (!keep.has(id)) {
      marker.remove();
      markersRef.current.delete(id);
    }
  }

  for (const gig of gigs) {
    if (markersRef.current.has(gig.id)) continue;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "gig-marker";
    el.style.setProperty("--gig-marker", CATEGORY_MARKER[gig.category] ?? "var(--accent)");
    el.dataset.gigId = gig.id;
    el.setAttribute("aria-label", `${gig.title}, ${gig.performer?.name ?? "Unknown"}`);
    el.setAttribute("aria-expanded", "false");

    const popup = new Popup({
      offset: 22,
      closeButton: true,
      closeOnClick: false,
      // Focusing the link on open scrolls the page on touch devices and hides the popup.
      focusAfterOpen: false,
      maxWidth: popupMaxWidth(map),
      // Inset used only when choosing an anchor, so a pin near the edge opens inward.
      padding: { top: 12, right: 12, bottom: 12, left: 12 },
    }).setDOMContent(popupContent(gig));

    // MapLibre only opens a marker popup from the map click, inside togglePopup,
    // which is also what assigns the popup's coordinates. TouchPanHandler
    // preventDefault() on a moving touch cancels that click, so a tap never
    // arrived. Keep the gesture on the pin and open the popup from here.
    const activate = (event: Event) => {
      event.stopPropagation();
      onSelectRef.current(gig.id);
      popup.setLngLat([gig.location.lng, gig.location.lat]);
      if (!popup.isOpen()) popup.addTo(map);
    };
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

    // setPopup before setLngLat. Marker.setLngLat only copies coordinates onto
    // a popup that is already attached. The other order leaves the popup with
    // no position, so addTo creates no DOM while isOpen() stays true.
    const marker = new Marker({ element: el, anchor: "center" })
      .setPopup(popup)
      .setLngLat([gig.location.lng, gig.location.lat])
      .addTo(map);

    if (gig.id === selectedId) {
      popup.addTo(map);
    }
    markersRef.current.set(gig.id, marker);
  }
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
  when.textContent = formatGigWhen(gig.datetime, gig.timezone);

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
