import { useState } from "react";
import { useAsync } from "../hooks/useAsync";
import { createInspection, listInspections } from "../api/inspections";
import { listRoads, listSegments } from "../api/roads";
import { PriorityBadge } from "../components/shared/PriorityBadge";
import { FrameCard } from "../components/shared/FrameCard";
import { BlockRangePicker, type KmRange } from "../components/upload/BlockRangePicker";
import type { Inspection } from "../api/types";

type MediaKind = "video" | "photo";

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
  const [mediaKind, setMediaKind] = useState<MediaKind>("video");
  const [range, setRange] = useState<KmRange | null>(null);
  const [rangePickerKey, setRangePickerKey] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const segmentsForRoad = (segments ?? []).filter(
    (segment) => String(segment.road_id) === roadId
  );

  const selectedSegment = (segments ?? []).find((s) => String(s.id) === segmentId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!segmentId || !file) return;
    if (mediaKind === "photo" && !range) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await createInspection(Number(segmentId), file, range ?? undefined);
      setFile(null);
      setSegmentId("");
      setRange(null);
      setRangePickerKey((k) => k + 1);
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
                  km {segment.km_start} – {segment.km_end}
                  {segment.direction ? ` (${segment.direction})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Tipo de mídia
            </label>
            <div className="flex rounded-md border border-slate-300 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => {
                  setMediaKind("video");
                  setFile(null);
                  setRange(null);
                  setRangePickerKey((k) => k + 1);
                }}
                className={`flex-1 py-1.5 ${
                  mediaKind === "video" ? "bg-slate-900 text-white" : "bg-white text-slate-600"
                }`}
              >
                Vídeo
              </button>
              <button
                type="button"
                onClick={() => {
                  setMediaKind("photo");
                  setFile(null);
                  setRange(null);
                  setRangePickerKey((k) => k + 1);
                }}
                className={`flex-1 py-1.5 ${
                  mediaKind === "photo" ? "bg-slate-900 text-white" : "bg-white text-slate-600"
                }`}
              >
                Foto
              </button>
            </div>
          </div>

          {selectedSegment && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {mediaKind === "video"
                  ? "Trecho que o vídeo cobre"
                  : "Bloco de 500m que a foto representa"}
              </label>
              <BlockRangePicker
                key={rangePickerKey}
                segment={selectedSegment}
                single={mediaKind === "photo"}
                onChange={setRange}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {mediaKind === "video" ? "Vídeo de inspeção" : "Foto"}
            </label>
            <input
              type="file"
              accept={mediaKind === "video" ? "video/*" : "image/*"}
              className="w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={
              !segmentId || !file || submitting || (mediaKind === "photo" && !range)
            }
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
  const [expanded, setExpanded] = useState(false);
  const hasFrames = inspection.frame_analyses.length > 0;

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => hasFrames && setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-slate-900">
            Inspeção #{inspection.id}
            {hasFrames && (
              <span className="text-xs text-slate-400 font-normal ml-2">
                {expanded ? "ocultar detalhes ▲" : "ver detalhes ▼"}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            status: {inspection.status} ·{" "}
            {new Date(inspection.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <PriorityBadge priority={inspection.priority} />
      </button>

      {expanded && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {inspection.frame_analyses.map((frame) => (
            <FrameCard key={frame.frame_index} frame={frame} />
          ))}
        </div>
      )}
    </li>
  );
}
