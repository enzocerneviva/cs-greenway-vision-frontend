import { useState } from "react";
import { useAsync } from "../hooks/useAsync";
import { createInspection, listInspections } from "../api/inspections";
import { listRoads, listSegments } from "../api/roads";
import { PriorityBadge } from "../components/shared/PriorityBadge";
import { FrameCard } from "../components/shared/FrameCard";
import { BlockRangePicker, type KmRange } from "../components/upload/BlockRangePicker";
import { Select } from "../components/ui/Select";
import { FileInput } from "../components/ui/FileInput";
import { LANE_LABEL } from "../lib/highwayBlocks";
import type { Inspection, LaneDirection } from "../api/types";

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
  const [direction, setDirection] = useState<LaneDirection | "">("");
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
    if (!segmentId || !file || !direction) return;
    if (mediaKind === "photo" && !range) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await createInspection(Number(segmentId), file, direction, range ?? undefined);
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
            <Select
              ariaLabel="Rodovia"
              placeholder="Selecione"
              value={roadId}
              onChange={(value) => {
                setRoadId(value);
                setSegmentId("");
              }}
              options={(roads ?? []).map((road) => ({ value: String(road.id), label: road.name }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Trecho
            </label>
            <Select
              ariaLabel="Trecho"
              placeholder="Selecione"
              value={segmentId}
              onChange={setSegmentId}
              disabled={!roadId}
              options={segmentsForRoad.map((segment) => ({
                value: String(segment.id),
                label: `km ${segment.km_start} – ${segment.km_end}${
                  segment.direction ? ` (${segment.direction})` : ""
                }`,
              }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Sentido da pista
            </label>
            <div className="flex rounded-md border border-slate-300 overflow-hidden text-sm">
              {(["CAPITAL", "INTERIOR"] as const).map((lane) => (
                <button
                  key={lane}
                  type="button"
                  onClick={() => setDirection(lane)}
                  className={`flex-1 py-1.5 ${
                    direction === lane ? "bg-slate-900 text-white dark:text-slate-50" : "bg-white text-slate-600"
                  }`}
                >
                  {LANE_LABEL[lane]}
                </button>
              ))}
            </div>
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
                  mediaKind === "video" ? "bg-slate-900 text-white dark:text-slate-50" : "bg-white text-slate-600"
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
                  mediaKind === "photo" ? "bg-slate-900 text-white dark:text-slate-50" : "bg-white text-slate-600"
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
            <FileInput
              file={file}
              onChange={setFile}
              accept={mediaKind === "video" ? "video/*" : "image/*"}
              prompt={mediaKind === "video" ? "Escolher vídeo" : "Escolher foto"}
              ariaLabel={mediaKind === "video" ? "Vídeo de inspeção" : "Foto"}
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={
              !segmentId ||
              !file ||
              !direction ||
              submitting ||
              (mediaKind === "photo" && !range)
            }
            className="w-full rounded-md bg-emerald-600 text-white text-sm font-medium py-2 disabled:opacity-50"
          >
            {submitting ? "Enviando e analisando..." : "Enviar inspeção"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg border border-slate-200 p-5 min-w-0">
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
    <li className="py-3 min-w-0">
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
            status: {inspection.status}
            {inspection.direction ? ` · ${LANE_LABEL[inspection.direction]}` : ""} ·{" "}
            {new Date(inspection.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <PriorityBadge priority={inspection.priority} />
      </button>

      {expanded && (
        <div className="mt-1 flex gap-3 overflow-x-auto px-1 pt-3 pb-5">
          {inspection.frame_analyses.map((frame) => (
            <FrameCard key={frame.frame_index} frame={frame} />
          ))}
        </div>
      )}
    </li>
  );
}
