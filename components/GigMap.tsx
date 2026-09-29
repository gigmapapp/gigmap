"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, Popup } from "maplibre-gl";
import {
  AUSTIN_CENTER,
  CATEGORY_MARKER,
  DARK_MAP_STYLE,
} from "@/lib/map-style";
import { categoryLabel, formatGigWhen } from "@/lib/format";
import type { Category, Gig, Performer } from "@/lib/types";

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
      center: [AUSTIN_CENTER.lng, AUSTIN_CENTER.lat],
      zoom: AUSTIN_CENTER.zoom,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    const markers = markersRef.current;
    const sync = () => {
      syncMarkers(map, gigsRef.current, selectedRef.current, onSelectRef, markersRef);
    };
    map.on("load", sync);
    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    syncMarkers(map, gigs, selectedId, onSelectRef, markersRef);
  }, [gigs, selectedId]);

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

  return <div ref={containerRef} className="h-full min-h-[320px] w-full" />;
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
      maxWidth: "260px",
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
  when.textContent = formatGigWhen(gig.datetime);

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
