import { useMemo, useState } from "react";
import { useAsync } from "../hooks/useAsync";
import { createRoad, createSegment, listRoads, listSegments } from "../api/roads";
import { listInspections } from "../api/inspections";
import { PriorityBadge } from "../components/shared/PriorityBadge";
import { SegmentsMap } from "../components/highways/SegmentsMap";
import type { Inspection, Priority, Road, Segment } from "../api/types";

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

  const visibleSegments = useMemo(() => {
    const segments = segmentsState.data ?? [];
    if (!selectedRoadId) return segments;
    return segments.filter((s) => String(s.road_id) === selectedRoadId);
  }, [segmentsState.data, selectedRoadId]);

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
        <CadastroPanel roads={roadsState.data ?? []} onCreated={refetchAll} />

        <section>
          <h2 className="font-semibold text-slate-900 mb-4">
            Trechos e última análise
          </h2>

          {(segmentsState.loading || inspectionsState.loading) && (
            <p className="text-sm text-slate-500">Carregando...</p>
          )}
          {segmentsState.error && (
            <p className="text-sm text-red-600">{segmentsState.error}</p>
          )}
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
}: {
  segment: Segment;
  road: Road | undefined;
  latestInspection: Inspection | undefined;
}) {
  const priority = latestInspection?.priority ?? null;
  const borderClass = CARD_BORDER[priority ?? "NONE"];
  const hasCoordinates = segment.lat_start != null;

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
            km {segment.km_start} – {segment.km_end} · {segment.direction}
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
      {!hasCoordinates && (
        <p className="text-xs text-amber-600 mt-1">sem coordenadas · não aparece no mapa</p>
      )}
    </div>
  );
}

function CadastroPanel({
  roads,
  onCreated,
}: {
  roads: Road[];
  onCreated: () => void;
}) {
  const [roadName, setRoadName] = useState("");
  const [roadSubmitting, setRoadSubmitting] = useState(false);
  const [roadError, setRoadError] = useState<string | null>(null);

  const [segmentRoadId, setSegmentRoadId] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [direction, setDirection] = useState("");
  const [latStart, setLatStart] = useState("");
  const [lngStart, setLngStart] = useState("");
  const [latEnd, setLatEnd] = useState("");
  const [lngEnd, setLngEnd] = useState("");
  const [segmentSubmitting, setSegmentSubmitting] = useState(false);
  const [segmentError, setSegmentError] = useState<string | null>(null);

  async function handleCreateRoad(event: React.FormEvent) {
    event.preventDefault();
    if (!roadName.trim()) return;

    setRoadSubmitting(true);
    setRoadError(null);
    try {
      await createRoad(roadName.trim());
      setRoadName("");
      onCreated();
    } catch (err) {
      setRoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setRoadSubmitting(false);
    }
  }

  async function handleCreateSegment(event: React.FormEvent) {
    event.preventDefault();
    if (!segmentRoadId || !kmStart || !kmEnd || !direction.trim()) return;

    const hasAnyCoordinate = [latStart, lngStart, latEnd, lngEnd].some(
      (v) => v.trim() !== ""
    );
    const hasAllCoordinates = [latStart, lngStart, latEnd, lngEnd].every(
      (v) => v.trim() !== ""
    );
    if (hasAnyCoordinate && !hasAllCoordinates) {
      setSegmentError(
        "Preencha as 4 coordenadas (início e fim) ou deixe todas em branco."
      );
      return;
    }

    setSegmentSubmitting(true);
    setSegmentError(null);
    try {
      await createSegment({
        road_id: Number(segmentRoadId),
        km_start: Number(kmStart),
        km_end: Number(kmEnd),
        direction: direction.trim(),
        ...(hasAllCoordinates && {
          lat_start: Number(latStart),
          lng_start: Number(lngStart),
          lat_end: Number(latEnd),
          lng_end: Number(lngEnd),
        }),
      });
      setKmStart("");
      setKmEnd("");
      setDirection("");
      setLatStart("");
      setLngStart("");
      setLatEnd("");
      setLngEnd("");
      onCreated();
    } catch (err) {
      setSegmentError(err instanceof Error ? err.message : String(err));
    } finally {
      setSegmentSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Nova rodovia</h2>
        <form onSubmit={handleCreateRoad} className="space-y-3">
          <input
            type="text"
            placeholder="Nome da rodovia (ex: BR-101)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={roadName}
            onChange={(e) => setRoadName(e.target.value)}
          />
          {roadError && <p className="text-sm text-red-600">{roadError}</p>}
          <button
            type="submit"
            disabled={!roadName.trim() || roadSubmitting}
            className="w-full rounded-md bg-emerald-600 text-white text-sm font-medium py-2 disabled:opacity-50"
          >
            {roadSubmitting ? "Salvando..." : "Cadastrar rodovia"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Novo trecho</h2>
        <form onSubmit={handleCreateSegment} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Rodovia
            </label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={segmentRoadId}
              onChange={(e) => setSegmentRoadId(e.target.value)}
            >
              <option value="">Selecione</option>
              {roads.map((road) => (
                <option key={road.id} value={road.id}>
                  {road.name}
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Sentido
            </label>
            <input
              type="text"
              placeholder="ex: NORTE"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-slate-600 mb-1">
              Coordenadas (opcional — necessário pra aparecer no mapa)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                placeholder="lat início"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={latStart}
                onChange={(e) => setLatStart(e.target.value)}
              />
              <input
                type="number"
                step="any"
                placeholder="lng início"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={lngStart}
                onChange={(e) => setLngStart(e.target.value)}
              />
              <input
                type="number"
                step="any"
                placeholder="lat fim"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={latEnd}
                onChange={(e) => setLatEnd(e.target.value)}
              />
              <input
                type="number"
                step="any"
                placeholder="lng fim"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={lngEnd}
                onChange={(e) => setLngEnd(e.target.value)}
              />
            </div>
          </div>

          {segmentError && (
            <p className="text-sm text-red-600">{segmentError}</p>
          )}

          <button
            type="submit"
            disabled={
              !segmentRoadId || !kmStart || !kmEnd || !direction.trim() || segmentSubmitting
            }
            className="w-full rounded-md bg-emerald-600 text-white text-sm font-medium py-2 disabled:opacity-50"
          >
            {segmentSubmitting ? "Salvando..." : "Cadastrar trecho"}
          </button>
        </form>
      </section>
    </div>
  );
}
