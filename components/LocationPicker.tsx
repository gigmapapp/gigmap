"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, NavigationControl } from "maplibre-gl";
import { AUSTIN_CENTER, DARK_MAP_STYLE } from "@/lib/map-style";

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
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new Map({
      container: containerRef.current,
      style: DARK_MAP_STYLE,
      center: [AUSTIN_CENTER.lng, AUSTIN_CENTER.lat],
      zoom: 12.2,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (event) => {
      onChangeRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    if (!markerRef.current) {
      markerRef.current = new Marker({ color: "#F97316" }).addTo(map);
    }
    markerRef.current.setLngLat([lng, lat]);
  }, [lat, lng]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <div ref={containerRef} className="h-64 w-full" />
      <p className="bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
        Tap the map to set lat/lng. Add a venue label below.
      </p>
    </div>
  );
}
