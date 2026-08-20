import { useMemo, useState } from "react";
import type { Priority, Road, Segment, Inspection } from "../../api/types";
import { buildHighwayBlocks, type HighwayBlock } from "../../lib/highwayBlocks";

const PRIORITY_BG: Record<Priority, string> = {
  LOW: "bg-emerald-500 hover:bg-emerald-400",
  MEDIUM: "bg-amber-500 hover:bg-amber-400",
  HIGH: "bg-red-500 hover:bg-red-400",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export function HighwayStrip({
  roads,
  segments,
  latestBySegment,
}: {
  roads: Road[];
  segments: Segment[];
  latestBySegment: Map<number, Inspection>;
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
    () => buildHighwayBlocks(roadSegments, latestBySegment),
    [roadSegments, latestBySegment]
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
      <div className="rounded-xl bg-slate-950 text-slate-400 p-8 text-center text-sm">
        Nenhuma rodovia cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-950 text-slate-100 overflow-hidden">
      {/* Tabs de rodovia */}
      <div className="flex items-center gap-2 px-5 pt-5 flex-wrap">
        {roads.map((road) => (
          <button
            key={road.id}
            type="button"
            onClick={() => {
              setSelectedRoadId(road.id);
              setSelectedBlock(null);
            }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              road.id === activeRoadId
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {road.name}
          </button>
        ))}
      </div>

      {activeRoad?.concessionaire && (
        <p className="px-5 mt-1 text-xs text-slate-500">{activeRoad.concessionaire}</p>
      )}

      {/* Barra de filtros e estatísticas */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <select
          className="rounded-md bg-slate-900 border border-slate-800 px-3 py-1.5 text-sm text-slate-200"
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
          className="w-32 rounded-md bg-slate-900 border border-slate-800 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500"
          value={kmSearch}
          onChange={(e) => setKmSearch(e.target.value)}
        />

        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="text-slate-400">{blocks.length} blocos de 500m</span>
          <StatDot color="bg-emerald-500" count={counts.LOW} />
          <StatDot color="bg-amber-500" count={counts.MEDIUM} />
          <StatDot color="bg-red-500" count={counts.HIGH} />
        </div>
      </div>

      {/* Faixa horizontal de blocos */}
      <div className="px-5 pb-2 overflow-x-auto">
        <div className="flex gap-0.5 w-max pb-2">
          {visibleBlocks.map((block) => (
            <button
              key={block.index}
              type="button"
              title={`km ${block.kmStart.toFixed(1)}–${block.kmEnd.toFixed(1)} · ${
                block.priority ? PRIORITY_LABEL[block.priority] : "sem dado"
              }`}
              onClick={() => setSelectedBlock(block)}
              className={`h-12 w-4 shrink-0 rounded-sm transition-transform ${
                block.priority ? PRIORITY_BG[block.priority] : "bg-slate-800 hover:bg-slate-700"
              } ${selectedBlock?.index === block.index ? "ring-2 ring-white scale-y-110" : ""}`}
            />
          ))}
        </div>
        {visibleBlocks.length > 0 && (
          <div className="flex justify-between text-[10px] text-slate-500 w-max min-w-full pr-4">
            <span>km {visibleBlocks[0].kmStart.toFixed(1)}</span>
            <span>km {visibleBlocks[visibleBlocks.length - 1].kmEnd.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Painel de detalhe */}
      <div className="border-t border-slate-900 px-5 py-4">
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
    <span className="flex items-center gap-1 text-slate-300">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {count}
    </span>
  );
}

function BlockDetail({ block }: { block: HighwayBlock }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">
            km {block.kmStart.toFixed(1)} – {block.kmEnd.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500">
            {block.priority
              ? `Criticidade ${PRIORITY_LABEL[block.priority]}`
              : "Sem inspeção cobrindo esse trecho ainda"}
          </p>
        </div>
        {block.inspection && block.frames.length > 0 && (
          <p className="text-xs text-slate-500">
            última inspeção: {new Date(block.inspection.created_at).toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {block.frames.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {block.frames.map((frame) => (
            <div
              key={frame.frame_index}
              className="shrink-0 w-28 rounded-md bg-slate-900 border border-slate-800 p-2"
            >
              <div
                className={`h-14 w-full rounded ${
                  PRIORITY_BG[frame.priority].split(" ")[0]
                } opacity-30 flex items-center justify-center text-[10px] text-slate-950 font-medium`}
              >
                sem imagem
              </div>
              <p className="text-[10px] text-slate-400 mt-1">km {frame.estimated_km.toFixed(2)}</p>
              <p className="text-[10px] text-slate-500">
                verde {frame.green_percent.toFixed(1)}% · {PRIORITY_LABEL[frame.priority]}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-600">Nenhum frame de inspeção mapeado pra esse bloco.</p>
      )}
    </div>
  );
}
