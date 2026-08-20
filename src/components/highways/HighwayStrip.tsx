import { useMemo, useState } from "react";
import type { Priority, Road, Segment, Inspection } from "../../api/types";
import { buildHighwayBlocks, type HighwayBlock } from "../../lib/highwayBlocks";
import { mediaUrl } from "../../api/client";

const PRIORITY_BG: Record<Priority, string> = {
  LOW: "bg-emerald-500 hover:bg-emerald-600",
  MEDIUM: "bg-amber-500 hover:bg-amber-600",
  HIGH: "bg-red-500 hover:bg-red-600",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export function HighwayStrip({
  roads,
  segments,
  inspectionsBySegment,
}: {
  roads: Road[];
  segments: Segment[];
  inspectionsBySegment: Map<number, Inspection[]>;
}) {
  const [selectedRoadId, setSelectedRoadId] = useState<number | null>(roads[0]?.id ?? null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | "">("");
  const [kmSearch, setKmSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<HighwayBlock | null>(null);

  const activeRoadId = selectedRoadId ?? roads[0]?.id ?? null;
  const activeRoad = roads.find((r) => r.id === activeRoadId) ?? null;

  const roadSegments = useMemo(
    () => segments.filter((s) => s.road_id === activeRoadId),
    [segments, activeRoadId]
  );

  const blocks = useMemo(
    () => buildHighwayBlocks(roadSegments, inspectionsBySegment),
    [roadSegments, inspectionsBySegment]
  );

  const visibleBlocks = useMemo(() => {
    return blocks.filter((block) => {
      if (priorityFilter && block.priority !== priorityFilter) return false;
      if (kmSearch.trim()) {
        const km = Number(kmSearch);
        if (!Number.isNaN(km) && (km < block.kmStart || km >= block.kmEnd)) return false;
      }
      return true;
    });
  }, [blocks, priorityFilter, kmSearch]);

  const counts = useMemo(() => {
    const result: Record<Priority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const block of blocks) {
      if (block.priority) result[block.priority] += 1;
    }
    return result;
  }, [blocks]);

  if (roads.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-10 text-center text-sm text-slate-500">
        Nenhuma rodovia cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Tabs de rodovia */}
      <div className="flex items-center gap-2 px-6 pt-6 flex-wrap">
        {roads.map((road) => (
          <button
            key={road.id}
            type="button"
            onClick={() => {
              setSelectedRoadId(road.id);
              setSelectedBlock(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              road.id === activeRoadId
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {road.name}
          </button>
        ))}
      </div>

      {activeRoad?.concessionaire && (
        <p className="px-6 mt-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
          {activeRoad.concessionaire}
        </p>
      )}

      {/* Barra de filtros e estatísticas */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-5">
        <select
          className="rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | "")}
        >
          <option value="">Todas as criticidades</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
        </select>
        <input
          type="number"
          placeholder="buscar por km"
          className="w-36 rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400"
          value={kmSearch}
          onChange={(e) => setKmSearch(e.target.value)}
        />

        <div className="ml-auto flex items-center gap-5 text-sm">
          <span className="text-slate-400">{blocks.length} blocos de 500m</span>
          <StatDot color="bg-emerald-500" count={counts.LOW} />
          <StatDot color="bg-amber-500" count={counts.MEDIUM} />
          <StatDot color="bg-red-500" count={counts.HIGH} />
        </div>
      </div>

      {/* Faixa horizontal de blocos */}
      <div className="px-6 pb-3 overflow-x-auto">
        <div className="flex gap-1 w-max pb-3 pt-1">
          {visibleBlocks.map((block) => (
            <button
              key={block.index}
              type="button"
              title={`km ${block.kmStart.toFixed(1)}–${block.kmEnd.toFixed(1)} · ${
                block.priority ? PRIORITY_LABEL[block.priority] : "sem dado"
              }`}
              onClick={() => setSelectedBlock(block)}
              className={`h-20 w-7 shrink-0 rounded-md shadow-sm transition-all ${
                block.priority
                  ? `${PRIORITY_BG[block.priority]} shadow-md`
                  : "bg-slate-100 hover:bg-slate-200 border border-slate-200"
              } ${
                selectedBlock?.index === block.index
                  ? "ring-2 ring-offset-2 ring-slate-900 scale-y-105"
                  : ""
              }`}
            />
          ))}
        </div>
        {visibleBlocks.length > 0 && (
          <div className="flex justify-between text-xs text-slate-400 font-medium w-max min-w-full pr-4">
            <span>km {visibleBlocks[0].kmStart.toFixed(1)}</span>
            <span>km {visibleBlocks[visibleBlocks.length - 1].kmEnd.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Painel de detalhe */}
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
        {selectedBlock ? (
          <BlockDetail block={selectedBlock} />
        ) : (
          <p className="text-sm text-slate-500">
            Clique em um bloco pra ver os detalhes daquele trecho de 500m.
          </p>
        )}
      </div>
    </div>
  );
}

function StatDot({ color, count }: { color: string; count: number }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {count}
    </span>
  );
}

function BlockDetail({ block }: { block: HighwayBlock }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-base font-semibold text-slate-900">
            km {block.kmStart.toFixed(1)} – {block.kmEnd.toFixed(1)}
          </p>
          <p className="text-sm text-slate-500">
            {block.priority
              ? `Criticidade ${PRIORITY_LABEL[block.priority]}`
              : "Sem inspeção cobrindo esse trecho ainda"}
          </p>
        </div>
        {block.inspection && block.frames.length > 0 && (
          <p className="text-xs text-slate-400">
            última inspeção: {new Date(block.inspection.created_at).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {block.frames.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {block.frames.map((frame) => (
            <div
              key={frame.frame_index}
              className="shrink-0 w-32 rounded-lg bg-white border border-slate-200 shadow-sm p-2.5"
            >
              {frame.image_path ? (
                <img
                  src={mediaUrl(frame.image_path)}
                  alt={`Frame em km ${frame.estimated_km.toFixed(2)}`}
                  className="h-16 w-full rounded-md object-cover"
                />
              ) : (
                <div
                  className={`h-16 w-full rounded-md ${
                    PRIORITY_BG[frame.priority].split(" ")[0]
                  } opacity-20 flex items-center justify-center text-[10px] text-slate-600 font-medium`}
                >
                  sem imagem
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1.5">
                km {frame.estimated_km.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400">
                verde {frame.green_percent.toFixed(1)}% · {PRIORITY_LABEL[frame.priority]}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Nenhum frame de inspeção mapeado pra esse bloco.</p>
      )}
    </div>
  );
}
