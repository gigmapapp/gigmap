"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { ACCENT } from "@/lib/accent";
import { maplibreWorkerUrl } from "@/lib/map-pins";
import { MYSTIC_CENTER, loadVoyagerStyle, noteMapError, voyagerRasterStyle } from "@/lib/map-style";

if (typeof window !== "undefined") {
  setWorkerUrl(maplibreWorkerUrl(window.location.origin));
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (coords: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    let cancelled = false;
    let map: Map | null = null;
    void loadVoyagerStyle()
      .catch(() => voyagerRasterStyle())
      .then((style) => {
      if (cancelled || mapRef.current || !container.isConnected) return;
      const view = new Map({
        container,
        style,
        attributionControl: { compact: false },
        center: [MYSTIC_CENTER.lng, MYSTIC_CENTER.lat],
        zoom: 12.2,
      });
      map = view;
      view.on("error", (event) => {
        noteMapError(view, event.error);
      });
      view.addControl(new NavigationControl({ showCompass: false }), "top-right");
      view.on("click", (event) => {
        onChangeRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      });
      mapRef.current = view;
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    if (!markerRef.current) {
      markerRef.current = new Marker({ color: ACCENT })
        .setLngLat([lng, lat])
        .addTo(map);
      return;
    }
    markerRef.current.setLngLat([lng, lat]);
  }, [lat, lng]);

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div ref={containerRef} className="h-64 w-full" />
      <p className="bg-surface px-3 py-2 text-xs text-muted">
        Tap the map to set lat/lng. Add a venue label below.
      </p>
    </div>
  );
}
