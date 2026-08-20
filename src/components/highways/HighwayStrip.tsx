import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { Priority, Road, Segment, Inspection } from "../../api/types";
import { buildHighwayBlocks, LANES, LANE_LABEL, type HighwayBlock } from "../../lib/highwayBlocks";

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

interface HoverState {
  block: HighwayBlock;
  x: number; // centro horizontal, em px, relativo à viewport
  y: number; // topo do bloco, em px, relativo à viewport
}

function worstBlockPriority(block: HighwayBlock): Priority | null {
  const priorities = LANES.map((lane) => block.lanes[lane].priority).filter(
    (p): p is Priority => p !== null
  );
  if (priorities.length === 0) return null;
  const severity: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  return priorities.reduce((worst, p) => (severity[p] > severity[worst] ? p : worst));
}

export function HighwayStrip({
  roads,
  segments,
  inspectionsBySegment,
}: {
  roads: Road[];
  segments: Segment[];
  inspectionsBySegment: Map<number, Inspection[]>;
}) {
  const navigate = useNavigate();
  const [selectedRoadId, setSelectedRoadId] = useState<number | null>(roads[0]?.id ?? null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | "">("");
  const [kmSearch, setKmSearch] = useState("");
  const [hover, setHover] = useState<HoverState | null>(null);

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
      const worst = worstBlockPriority(block);
      if (priorityFilter && worst !== priorityFilter) return false;
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
      for (const lane of LANES) {
        const p = block.lanes[lane].priority;
        if (p) result[p] += 1;
      }
    }
    return result;
  }, [blocks]);

  function openBlock(block: HighwayBlock) {
    if (!activeRoadId) return;
    navigate(`/highways/${activeRoadId}/trecho/${block.kmStart.toFixed(1)}`);
  }

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
            onClick={() => setSelectedRoadId(road.id)}
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

      {/* Legenda dos sentidos */}
      <div className="flex items-center gap-4 px-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-slate-300" /> topo = {LANE_LABEL.CAPITAL}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-slate-400" /> base = {LANE_LABEL.INTERIOR}
        </span>
      </div>

      {/* Faixa horizontal de blocos */}
      <div className="px-6 pb-5 pt-2 overflow-x-auto">
        <div className="flex gap-1 w-max pb-3 pt-1">
          {visibleBlocks.map((block) => (
            <BlockButton
              key={block.index}
              block={block}
              onOpen={() => openBlock(block)}
              onHoverChange={setHover}
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

      {hover && <BlockTooltip hover={hover} />}
    </div>
  );
}

function BlockButton({
  block,
  onOpen,
  onHoverChange,
}: {
  block: HighwayBlock;
  onOpen: () => void;
  onHoverChange: (hover: HoverState | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleEnter() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    onHoverChange({ block, x: rect.left + rect.width / 2, y: rect.top });
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      onMouseEnter={handleEnter}
      onMouseLeave={() => onHoverChange(null)}
      className="flex flex-col gap-0.5 w-7 shrink-0 cursor-pointer rounded-md overflow-hidden shadow-sm"
    >
      <span
        className={`h-9 w-full block transition-colors ${
          block.lanes.CAPITAL.priority
            ? PRIORITY_BG[block.lanes.CAPITAL.priority]
            : "bg-slate-100 hover:bg-slate-200"
        }`}
      />
      <span
        className={`h-9 w-full block transition-colors ${
          block.lanes.INTERIOR.priority
            ? PRIORITY_BG[block.lanes.INTERIOR.priority]
            : "bg-slate-100 hover:bg-slate-200"
        }`}
      />
    </div>
  );
}

// Renderizado via portal em document.body — a faixa de blocos tem
// overflow-x-auto, que corta (também no eixo vertical, por regra do CSS)
// qualquer coisa posicionada dentro dela que ultrapasse a borda.
function BlockTooltip({ hover }: { hover: HoverState }) {
  const { block, x, y } = hover;

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 text-white text-xs p-3 shadow-xl"
      style={{ left: x, top: y - 10 }}
    >
      <p className="font-semibold">
        km {block.kmStart.toFixed(1)} – {block.kmEnd.toFixed(1)}
      </p>
      <div className="mt-1.5 space-y-1">
        {LANES.map((lane) => (
          <p key={lane} className="text-slate-300">
            {LANE_LABEL[lane]}:{" "}
            {block.lanes[lane].priority ? PRIORITY_LABEL[block.lanes[lane].priority!] : "sem dado"}
          </p>
        ))}
      </div>
      <p className="text-emerald-400 mt-1.5 font-medium">Clique pra ver detalhes →</p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
    </div>,
    document.body
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
