import { useState } from "react";
import { useAsync } from "../hooks/useAsync";
import {
  createInspection,
  listInspections,
  listRoads,
  listSegments,
} from "../api/inspections";
import { PriorityBadge } from "../components/shared/PriorityBadge";
import type { Inspection } from "../api/types";

export function UploadPage() {
  const { data: roads } = useAsync(listRoads, []);
  const { data: segments } = useAsync(listSegments, []);
  const {
    data: inspections,
    loading: loadingInspections,
    error: inspectionsError,
    refetch,
  } = useAsync(listInspections, []);

  const [roadId, setRoadId] = useState<string>("");
  const [segmentId, setSegmentId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const segmentsForRoad = (segments ?? []).filter(
    (segment) => String(segment.road_id) === roadId
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!segmentId || !file) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await createInspection(Number(segmentId), file);
      setFile(null);
      setSegmentId("");
      refetch();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
      <section className="bg-white rounded-lg border border-slate-200 p-5 h-fit">
        <h2 className="font-semibold text-slate-900 mb-4">Nova inspeção</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Rodovia
            </label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={roadId}
              onChange={(e) => {
                setRoadId(e.target.value);
                setSegmentId("");
              }}
            >
              <option value="">Selecione</option>
              {(roads ?? []).map((road) => (
                <option key={road.id} value={road.id}>
                  {road.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Trecho
            </label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              disabled={!roadId}
            >
              <option value="">Selecione</option>
              {segmentsForRoad.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  km {segment.km_start} – {segment.km_end} ({segment.direction})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Vídeo de inspeção
            </label>
            <input
              type="file"
              accept="video/*"
              className="w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={!segmentId || !file || submitting}
            className="w-full rounded-md bg-emerald-600 text-white text-sm font-medium py-2 disabled:opacity-50"
          >
            {submitting ? "Enviando e analisando..." : "Enviar inspeção"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">
          Inspeções recentes
        </h2>

        {loadingInspections && (
          <p className="text-sm text-slate-500">Carregando...</p>
        )}
        {inspectionsError && (
          <p className="text-sm text-red-600">{inspectionsError}</p>
        )}

        {inspections && inspections.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma inspeção ainda.</p>
        )}

        <ul className="divide-y divide-slate-100">
          {(inspections ?? [])
            .slice()
            .reverse()
            .map((inspection) => (
              <InspectionRow key={inspection.id} inspection={inspection} />
            ))}
        </ul>
      </section>
    </div>
  );
}

function InspectionRow({ inspection }: { inspection: Inspection }) {
  return (
    <li className="py-3 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-900">
          Inspeção #{inspection.id}
        </p>
        <p className="text-xs text-slate-500">
          status: {inspection.status} ·{" "}
          {new Date(inspection.created_at).toLocaleString("pt-BR")}
        </p>
      </div>
      <PriorityBadge priority={inspection.priority} />
    </li>
  );
}
