import { useMemo, useState } from "react";
import { useAsync } from "../hooks/useAsync";
import {
  createRoad,
  createSegment,
  listRoads,
  listSegments,
  updateSegmentLocation,
} from "../api/roads";
import { listInspections } from "../api/inspections";
import { PriorityBadge } from "../components/shared/PriorityBadge";
import { SegmentsMap } from "../components/highways/SegmentsMap";
import { HighwayStrip } from "../components/highways/HighwayStrip";
import { LocationPicker, type PickedLocation } from "../components/highways/LocationPicker";
import type { Inspection, Priority, Road, Segment } from "../api/types";

type ViewMode = "blocks" | "map";

const CARD_BORDER: Record<Priority | "NONE", string> = {
  LOW: "border-l-emerald-500",
  MEDIUM: "border-l-amber-500",
  HIGH: "border-l-red-500",
  NONE: "border-l-slate-300",
};

export function HighwaysPage() {
  const roadsState = useAsync(listRoads, []);
  const segmentsState = useAsync(listSegments, []);
  const inspectionsState = useAsync(listInspections, []);
  const [selectedRoadId, setSelectedRoadId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("blocks");

  function refetchAll() {
    roadsState.refetch();
    segmentsState.refetch();
  }

  const latestBySegment = useMemo(() => {
    const map = new Map<number, Inspection>();
    for (const inspection of inspectionsState.data ?? []) {
      const current = map.get(inspection.segment_id);
      if (!current || inspection.created_at > current.created_at) {
        map.set(inspection.segment_id, inspection);
      }
    }
    return map;
  }, [inspectionsState.data]);

  const inspectionsBySegment = useMemo(() => {
    const map = new Map<number, Inspection[]>();
    for (const inspection of inspectionsState.data ?? []) {
      const list = map.get(inspection.segment_id) ?? [];
      list.push(inspection);
      map.set(inspection.segment_id, list);
    }
    return map;
  }, [inspectionsState.data]);

  const visibleSegments = useMemo(() => {
    const segments = segmentsState.data ?? [];
    if (!selectedRoadId) return segments;
    return segments.filter((s) => String(s.road_id) === selectedRoadId);
  }, [segmentsState.data, selectedRoadId]);

  const loading = roadsState.loading || segmentsState.loading || inspectionsState.loading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Rodovias</h1>
        <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-sm shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("blocks")}
            className={`px-4 py-1.5 rounded-md font-medium transition-all ${
              viewMode === "blocks"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Visão em blocos
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`px-4 py-1.5 rounded-md font-medium transition-all ${
              viewMode === "map"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Mapa e cadastro
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Carregando...</p>}

      {viewMode === "blocks" ? (
        <HighwayStrip
          roads={roadsState.data ?? []}
          segments={segmentsState.data ?? []}
          inspectionsBySegment={inspectionsBySegment}
        />
      ) : (
        <MapAndCadastroView
          roadsState={roadsState}
          segmentsState={segmentsState}
          selectedRoadId={selectedRoadId}
          setSelectedRoadId={setSelectedRoadId}
          visibleSegments={visibleSegments}
          latestBySegment={latestBySegment}
          refetchAll={refetchAll}
        />
      )}
    </div>
  );
}

function MapAndCadastroView({
  roadsState,
  segmentsState,
  selectedRoadId,
  setSelectedRoadId,
  visibleSegments,
  latestBySegment,
  refetchAll,
}: {
  roadsState: ReturnType<typeof useAsync<Road[]>>;
  segmentsState: ReturnType<typeof useAsync<Segment[]>>;
  selectedRoadId: string;
  setSelectedRoadId: (id: string) => void;
  visibleSegments: Segment[];
  latestBySegment: Map<number, Inspection>;
  refetchAll: () => void;
}) {
  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Mapa de criticidade</h2>
          <select
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={selectedRoadId}
            onChange={(e) => setSelectedRoadId(e.target.value)}
          >
            <option value="">Todas as rodovias</option>
            {(roadsState.data ?? []).map((road) => (
              <option key={road.id} value={road.id}>
                {road.name}
              </option>
            ))}
          </select>
        </div>
        <SegmentsMap
          segments={visibleSegments}
          roads={roadsState.data ?? []}
          latestBySegment={latestBySegment}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        <CadastroPanel onCreated={refetchAll} />

        <section>
          <h2 className="font-semibold text-slate-900 mb-4">Trechos e última análise</h2>

          {segmentsState.error && <p className="text-sm text-red-600">{segmentsState.error}</p>}
          {segmentsState.data && visibleSegments.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum trecho cadastrado ainda.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleSegments.map((segment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                road={(roadsState.data ?? []).find((r) => r.id === segment.road_id)}
                latestInspection={latestBySegment.get(segment.id)}
                onLocationSaved={refetchAll}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SegmentCard({
  segment,
  road,
  latestInspection,
  onLocationSaved,
}: {
  segment: Segment;
  road: Road | undefined;
  latestInspection: Inspection | undefined;
  onLocationSaved: () => void;
}) {
  const priority = latestInspection?.priority ?? null;
  const borderClass = CARD_BORDER[priority ?? "NONE"];
  const hasCoordinates = segment.lat_start != null;

  const [editingLocation, setEditingLocation] = useState(false);
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveLocation() {
    if (!picked) return;
    setSaving(true);
    setError(null);
    try {
      await updateSegmentLocation(segment.id, picked);
      setEditingLocation(false);
      setPicked(null);
      onLocationSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 border-l-4 ${borderClass} p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {road?.name ?? `Rodovia #${segment.road_id}`}
          </p>
          <p className="text-xs text-slate-500">
            km {segment.km_start} – {segment.km_end}
            {segment.direction ? ` · ${segment.direction}` : ""}
          </p>
        </div>
        <PriorityBadge priority={priority} />
      </div>

      <p className="text-xs text-slate-400 mt-3">
        {latestInspection
          ? `última inspeção: ${new Date(
              latestInspection.created_at
            ).toLocaleString("pt-BR")}`
          : "sem inspeções ainda"}
      </p>

      {!hasCoordinates && !editingLocation && (
        <div className="mt-2">
          <p className="text-xs text-amber-600">sem coordenadas · não aparece no mapa</p>
          <button
            type="button"
            onClick={() => setEditingLocation(true)}
            className="text-xs text-emerald-700 underline mt-1"
          >
            Definir localização no mapa
          </button>
        </div>
      )}

      {editingLocation && (
        <div className="mt-3 space-y-2">
          <LocationPicker onChange={setPicked} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!picked || saving}
              onClick={handleSaveLocation}
              className="flex-1 rounded-md bg-emerald-600 text-white text-xs font-medium py-1.5 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar localização"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingLocation(false);
                setPicked(null);
                setError(null);
              }}
              className="rounded-md border border-slate-300 text-xs font-medium py-1.5 px-3"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CadastroPanel({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [roadName, setRoadName] = useState("");
  const [concessionaire, setConcessionaire] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!roadName.trim() || !kmStart || !kmEnd) return;

    setSubmitting(true);
    setError(null);
    try {
      const road = await createRoad(roadName.trim(), concessionaire.trim() || undefined);
      await createSegment({
        road_id: road.id,
        km_start: Number(kmStart),
        km_end: Number(kmEnd),
      });
      setRoadName("");
      setConcessionaire("");
      setKmStart("");
      setKmEnd("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <h2 className="font-semibold text-slate-900 mb-1">Nova rodovia</h2>
      <p className="text-xs text-slate-500 mb-4">
        Nome + o intervalo de km que ela abrange. A divisão em blocos de 500m e o mapa são
        gerados automaticamente a partir disso.
      </p>
      <form onSubmit={handleCreate} className="space-y-3">
        <input
          type="text"
          placeholder="Nome da rodovia (ex: SP-330)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={roadName}
          onChange={(e) => setRoadName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Concessionária (opcional)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={concessionaire}
          onChange={(e) => setConcessionaire(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Km inicial
            </label>
            <input
              type="number"
              step="0.1"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={kmStart}
              onChange={(e) => setKmStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Km final
            </label>
            <input
              type="number"
              step="0.1"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={kmEnd}
              onChange={(e) => setKmEnd(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!roadName.trim() || !kmStart || !kmEnd || submitting}
          className="w-full rounded-md bg-emerald-600 text-white text-sm font-medium py-2 disabled:opacity-50"
        >
          {submitting ? "Salvando..." : "Cadastrar rodovia"}
        </button>
      </form>
    </section>
  );
}
