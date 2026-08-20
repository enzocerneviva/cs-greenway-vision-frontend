import { useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

const DEFAULT_CENTER: LatLngExpression = [-22.9068, -43.3];

export interface PickedLocation {
  lat_start: number;
  lng_start: number;
  lat_end: number;
  lng_end: number;
}

export function LocationPicker({
  onChange,
}: {
  onChange: (location: PickedLocation | null) => void;
}) {
  const [start, setStart] = useState<LatLngExpression | null>(null);
  const [end, setEnd] = useState<LatLngExpression | null>(null);

  function handleMapClick(latlng: LatLngExpression) {
    if (!start) {
      setStart(latlng);
      onChange(null);
    } else if (!end) {
      setEnd(latlng);
      const [latStart, lngStart] = start as [number, number];
      const [latEnd, lngEnd] = latlng as [number, number];
      onChange({ lat_start: latStart, lng_start: lngStart, lat_end: latEnd, lng_end: lngEnd });
    } else {
      setStart(latlng);
      setEnd(null);
      onChange(null);
    }
  }

  function handleClear() {
    setStart(null);
    setEnd(null);
    onChange(null);
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">
        {!start
          ? "Clique no mapa pra marcar o início do trecho"
          : !end
          ? "Agora clique pra marcar o fim do trecho"
          : "Início e fim marcados — clique de novo pra recomeçar"}
      </p>
      <div className="h-56 rounded-md overflow-hidden border border-slate-300">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={11}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCapture onClick={handleMapClick} />
          {start && (
            <CircleMarker
              center={start}
              radius={8}
              pathOptions={{ color: "#059669", fillColor: "#059669", fillOpacity: 1 }}
            />
          )}
          {end && (
            <CircleMarker
              center={end}
              radius={8}
              pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 1 }}
            />
          )}
          {start && end && (
            <Polyline positions={[start, end]} pathOptions={{ color: "#64748b", dashArray: "6 6" }} />
          )}
        </MapContainer>
      </div>
      {(start || end) && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-slate-500 underline mt-1"
        >
          Limpar pontos
        </button>
      )}
    </div>
  );
}

function ClickCapture({ onClick }: { onClick: (latlng: LatLngExpression) => void }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}
