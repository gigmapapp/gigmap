"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, Popup } from "maplibre-gl";
import {
  AUSTIN_CENTER,
  CATEGORY_MARKER,
  DARK_MAP_STYLE,
} from "@/lib/map-style";
import { formatGigWhen } from "@/lib/format";
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
      marker.getElement().dataset.selected = id === selectedId ? "true" : "false";
      const popup = marker.getPopup();
      if (id === selectedId) {
        popup?.addTo(map);
      } else {
        popup?.remove();
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
    el.style.background = CATEGORY_MARKER[gig.category] ?? "#F97316";
    el.setAttribute("aria-label", gig.title);
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      onSelectRef.current(gig.id);
    });

    const popup = new Popup({ offset: 16, closeButton: false }).setHTML(
      `<div style="min-width:170px">
          <div style="font-size:11px;color:#fb923c;text-transform:uppercase;letter-spacing:.06em">${gig.category}</div>
          <div style="font-weight:650;margin-top:2px">${escapeHtml(gig.title)}</div>
          <div style="color:#a1a1aa;font-size:12px;margin-top:4px">${escapeHtml(formatGigWhen(gig.datetime))}</div>
          <div style="color:#d4d4d8;font-size:12px;margin-top:2px">${escapeHtml(gig.performer?.name ?? "Unknown")}</div>
          <a href="/gigs/${gig.id}" style="display:inline-block;margin-top:8px;color:#fdba74;font-size:12px">Open gig →</a>
        </div>`,
    );

    const marker = new Marker({ element: el })
      .setLngLat([gig.location.lng, gig.location.lat])
      .setPopup(popup)
      .addTo(map);

    if (gig.id === selectedId) {
      popup.addTo(map);
    }
    markersRef.current.set(gig.id, marker);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function categoryDot(category: Category) {
  return CATEGORY_MARKER[category];
}
