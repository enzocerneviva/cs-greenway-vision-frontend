import { useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { AddressSearch } from "./AddressSearch";
import { NumberInput } from "../ui/NumberInput";

const DEFAULT_CENTER: [number, number] = [-22.9068, -43.3];

export interface PickedLocation {
  lat_start: number;
  lng_start: number;
  lat_end: number;
  lng_end: number;
}

function coloredPinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.5)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const START_ICON = coloredPinIcon("#059669");
const END_ICON = coloredPinIcon("#2563eb");

export function LocationPicker({
  onChange,
}: {
  onChange: (location: PickedLocation | null) => void;
}) {
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  function emit(nextStart: [number, number] | null, nextEnd: [number, number] | null) {
    if (nextStart && nextEnd) {
      onChange({
        lat_start: nextStart[0],
        lng_start: nextStart[1],
        lat_end: nextEnd[0],
        lng_end: nextEnd[1],
      });
    } else {
      onChange(null);
    }
  }

  function handleMapClick(latlng: [number, number]) {
    if (!start) {
      setStart(latlng);
      emit(latlng, end);
    } else if (!end) {
      setEnd(latlng);
      emit(start, latlng);
    } else {
      setStart(latlng);
      setEnd(null);
      emit(latlng, null);
    }
  }

  function handleClear() {
    setStart(null);
    setEnd(null);
    onChange(null);
  }

  function handleAddressSelect(lat: number, lng: number) {
    setFlyTarget([lat, lng]);
  }

  function updateCoordinate(
    which: "start" | "end",
    axis: 0 | 1,
    rawValue: string
  ) {
    const value = rawValue === "" ? NaN : Number(rawValue);
    const current = which === "start" ? start : end;
    const base: [number, number] = current ?? [DEFAULT_CENTER[0], DEFAULT_CENTER[1]];
    const next: [number, number] = [...base];
    next[axis] = Number.isNaN(value) ? base[axis] : value;

    if (which === "start") {
      setStart(next);
      emit(next, end);
    } else {
      setEnd(next);
      emit(start, next);
    }
  }

  return (
    <div>
      <AddressSearch onSelect={handleAddressSelect} />

      <p className="text-xs text-slate-500 mb-1">
        {!start
          ? "Clique no mapa (ou arraste um pino) pra marcar o início do trecho"
          : !end
          ? "Agora clique pra marcar o fim do trecho"
          : "Início e fim marcados — arraste os pinos pra ajustar, ou clique de novo pra recomeçar"}
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
          <FlyTo target={flyTarget} />
          {start && (
            <Marker
              position={start}
              icon={START_ICON}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  const next: [number, number] = [lat, lng];
                  setStart(next);
                  emit(next, end);
                },
              }}
            />
          )}
          {end && (
            <Marker
              position={end}
              icon={END_ICON}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  const next: [number, number] = [lat, lng];
                  setEnd(next);
                  emit(start, next);
                },
              }}
            />
          )}
          {start && end && (
            <Polyline positions={[start, end]} pathOptions={{ color: "#64748b", dashArray: "6 6" }} />
          )}
        </MapContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <CoordinateInputs
          label="Início"
          color="#059669"
          value={start}
          onChange={(axis, value) => updateCoordinate("start", axis, value)}
        />
        <CoordinateInputs
          label="Fim"
          color="#2563eb"
          value={end}
          onChange={(axis, value) => updateCoordinate("end", axis, value)}
        />
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

function CoordinateInputs({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: string;
  value: [number, number] | null;
  onChange: (axis: 0 | 1, value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-1" style={{ color }}>
        {label}
      </p>
      <div className="grid grid-cols-2 gap-1">
        <NumberInput
          size="sm"
          ariaLabel={`${label}: latitude`}
          placeholder="lat"
          step={0.0001}
          min={-90}
          max={90}
          value={value ? value[0] : ""}
          onChange={(text) => onChange(0, text)}
        />
        <NumberInput
          size="sm"
          ariaLabel={`${label}: longitude`}
          placeholder="lng"
          step={0.0001}
          min={-180}
          max={180}
          value={value ? value[1] : ""}
          onChange={(text) => onChange(1, text)}
        />
      </div>
    </div>
  );
}

function ClickCapture({ onClick }: { onClick: (latlng: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const targetKey = target ? `${target[0]},${target[1]}` : null;

  useEffect(() => {
    if (target) map.flyTo(target, 15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  return null;
}
