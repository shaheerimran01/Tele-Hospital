'use client';

// Leaflet touches `window`, so this file is only loaded on the client
// (see the next/dynamic import in ClinicLocationPicker).

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
// leaflet.css loaded via CDN in layout.tsx

const markerIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

/** Whole of Pakistan when no pin is set yet. */
const DEFAULT_CENTER: [number, number] = [30.3753, 69.3451];
const DEFAULT_ZOOM = 5;
const PIN_ZOOM = 17;

interface Props {
  latitude: number | null;
  longitude: number | null;
  /** Called when the doctor drags the pin or clicks the map to place it. */
  onPick: (latitude: number, longitude: number) => void;
}

/** Pans to the pin whenever it changes (search result, GPS, or restored draft). */
function FollowPin({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    const target = L.latLng(latitude, longitude);
    // Small moves (dragging) keep the current zoom; jumps fly in close
    if (map.getCenter().distanceTo(target) > 2000 || map.getZoom() < 14) {
      map.flyTo(target, PIN_ZOOM, { duration: 0.8 });
    } else {
      map.panTo(target);
    }
  }, [latitude, longitude, map]);
  return null;
}

function ClickToPlace({ onPick }: { onPick: Props['onPick'] }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function ClinicMap({ latitude, longitude, onPick }: Props) {
  const hasPin = latitude != null && longitude != null;

  return (
    <MapContainer
      center={hasPin ? [latitude!, longitude!] : DEFAULT_CENTER}
      zoom={hasPin ? PIN_ZOOM : DEFAULT_ZOOM}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FollowPin latitude={latitude} longitude={longitude} />
      <ClickToPlace onPick={onPick} />
      {hasPin && (
        <Marker
          position={[latitude!, longitude!]}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend(e) {
              const { lat, lng } = (e.target as L.Marker).getLatLng();
              onPick(lat, lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
