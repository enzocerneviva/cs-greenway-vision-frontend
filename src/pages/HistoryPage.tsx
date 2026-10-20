import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAsync } from "../hooks/useAsync";
import { listInspections } from "../api/inspections";
import { listRoads, listSegments } from "../api/roads";
import { PriorityBadge } from "../components/shared/PriorityBadge";
import { FrameCard } from "../components/shared/FrameCard";
import { Select } from "../components/ui/Select";
import { DatePicker } from "../components/ui/DatePicker";
import { PRIORITY_COLORS } from "../lib/priorityColors";
import { BLOCK_SIZE_KM, LANE_LABEL } from "../lib/highwayBlocks";
import type { Inspection, LaneDirection, Priority, Road, Segment } from "../api/types";

const PAGE_SIZE = 30;

const PRIORITIES: Priority[] = ["HIGH", "MEDIUM", "LOW"];
const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};
const SEVERITY: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

type SortKey = "recent" | "oldest" | "severity";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigas" },
  { value: "severity", label: "Maior criticidade" },
];

interface Filters {
  q: string;
  road: string;
  dir: string;
  prio: string;
  from: string;
  to: string;
  sort: SortKey;
}

// Inspeção enriquecida com o que a tela precisa pra filtrar/exibir. Calculada
// uma vez por mudança nos dados (useMemo), não a cada tecla digitada.
interface HistoryItem {
  inspection: Inspection;
  road: Road | undefined;
  kmMin: number | null;
  kmMax: number | null;
  date: Date;
  dayKey: string; // YYYY-MM-DD no fuso local
  haystack: string; // texto em minúsculas onde a busca textual procura
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayLabel(dayKey: string): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey === toDayKey(today)) return "Hoje";
  if (dayKey === toDayKey(yesterday)) return "Ontem";
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildItems(
  inspections: Inspection[],
  roads: Road[],
  segments: Segment[]
): HistoryItem[] {
  const roadById = new Map(roads.map((r) => [r.id, r]));
  const segmentById = new Map(segments.map((s) => [s.id, s]));

  return inspections.map((inspection) => {
    const segment = segmentById.get(inspection.segment_id);
    const road = segment ? roadById.get(segment.road_id) : undefined;
    const kms = inspection.frame_analyses.map((f) => f.estimated_km);
    const kmMin = kms.length > 0 ? Math.min(...kms) : (segment?.km_start ?? null);
    const kmMax = kms.length > 0 ? Math.max(...kms) : (segment?.km_end ?? null);
    const date = new Date(inspection.created_at);

    const haystack = [
      `#${inspection.id}`,
      road?.name,
      road?.concessionaire,
      inspection.direction ? LANE_LABEL[inspection.direction] : null,
      kmMin !== null && kmMax !== null ? `km ${kmMin.toFixed(1)} ${kmMax.toFixed(1)}` : null,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return { inspection, road, kmMin, kmMax, date, dayKey: toDayKey(date), haystack };
  });
}

function readFilters(params: URLSearchParams): Filters {
  const sort = params.get("sort");
  return {
    q: params.get("q") ?? "",
    road: params.get("road") ?? "",
    dir: params.get("dir") ?? "",
    prio: params.get("prio") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    sort: sort === "oldest" || sort === "severity" ? sort : "recent",
  };
}

function matchesFilters(item: HistoryItem, f: Filters, ignorePriority = false): boolean {
  const { inspection } = item;
  if (f.q && !item.haystack.includes(f.q.trim().toLowerCase())) return false;
  if (f.road && String(item.road?.id) !== f.road) return false;
  if (f.dir && inspection.direction !== f.dir) return false;
  if (!ignorePriority && f.prio && inspection.priority !== f.prio) return false;
  if (f.from && item.dayKey < f.from) return false;
  if (f.to && item.dayKey > f.to) return false;
  return true;
}

export function HistoryPage() {
  const { data: inspections, loading, error } = useAsync(listInspections, []);
  const { data: roads } = useAsync(listRoads, []);
  const { data: segments } = useAsync(listSegments, []);

  // Filtros vivem na URL (?q=...&prio=HIGH): dá pra recarregar a página,
  // usar o botão voltar e compartilhar um link já filtrado.
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function setFilter(patch: Partial<Filters>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (!value || (key === "sort" && value === "recent")) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
    setVisibleCount(PAGE_SIZE);
  }

  function clearFilters() {
    setParams({}, { replace: true });
    setVisibleCount(PAGE_SIZE);
  }

  const items = useMemo(
    () => buildItems(inspections ?? [], roads ?? [], segments ?? []),
    [inspections, roads, segments]
  );

  // Contagens dos chips de criticidade: respeitam os OUTROS filtros, mas
  // ignoram o próprio filtro de criticidade — senão ao clicar em "Alta" os
  // chips "Média" e "Baixa" mostrariam 0 e não daria pra trocar de ideia.
  const priorityCounts = useMemo(() => {
    const counts: Record<Priority, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    let total = 0;
    for (const item of items) {
      if (!matchesFilters(item, filters, true)) continue;
      total += 1;
      if (item.inspection.priority) counts[item.inspection.priority] += 1;
    }
    return { counts, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, params]);

  const filtered = useMemo(() => {
    const list = items.filter((item) => matchesFilters(item, filters));
    list.sort((a, b) => {
      if (filters.sort === "oldest") return a.date.getTime() - b.date.getTime();
      if (filters.sort === "severity") {
        const sa = a.inspection.priority ? SEVERITY[a.inspection.priority] : -1;
        const sb = b.inspection.priority ? SEVERITY[b.inspection.priority] : -1;
        if (sa !== sb) return sb - sa;
      }
      return b.date.getTime() - a.date.getTime();
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, params]);

  const visible = filtered.slice(0, visibleCount);

  // Agrupar por dia só faz sentido na ordenação cronológica; por severidade
  // a lista é plana (agrupar por dia quebraria a ordem de severidade).
  const groups = useMemo(() => {
    if (filters.sort === "severity") return [{ key: "all", label: null, rows: visible }];
    const result: { key: string; label: string | null; rows: HistoryItem[] }[] = [];
    for (const item of visible) {
      const last = result[result.length - 1];
      if (last && last.key === item.dayKey) last.rows.push(item);
      else result.push({ key: item.dayKey, label: dayLabel(item.dayKey), rows: [item] });
    }
    return result;
  }, [visible, filters.sort]);

  const hasActiveFilters = Boolean(
    filters.q || filters.road || filters.dir || filters.prio || filters.from || filters.to
  );

  if (loading) return <p className="text-sm text-slate-500">Carregando...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Histórico</h2>
        <p className="text-sm text-slate-500">
          Todas as inspeções já realizadas. Use a busca e os filtros para
          encontrar uma ocorrência específica.
        </p>
      </div>

      <section className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            placeholder="Buscar por nº da inspeção, rodovia, concessionária ou km…"
            aria-label="Buscar inspeções"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
          {filters.q && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setFilter({ q: "" })}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Select
            label="Rodovia"
            value={filters.road}
            onChange={(road) => setFilter({ road })}
            options={[
              { value: "", label: "Todas" },
              ...(roads ?? []).map((road) => ({ value: String(road.id), label: road.name })),
            ]}
          />

          <Select
            label="Sentido"
            value={filters.dir}
            onChange={(dir) => setFilter({ dir })}
            options={[
              { value: "", label: "Ambos" },
              ...(Object.keys(LANE_LABEL) as LaneDirection[]).map((lane) => ({
                value: lane,
                label: LANE_LABEL[lane],
              })),
            ]}
          />

          <DatePicker label="De" value={filters.from} max={filters.to} onChange={(from) => setFilter({ from })} />
          <DatePicker label="Até" value={filters.to} min={filters.from} onChange={(to) => setFilter({ to })} />

          <Select
            label="Ordenar por"
            value={filters.sort}
            onChange={(sort) => setFilter({ sort: sort as SortKey })}
            options={SORT_OPTIONS}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip
            active={!filters.prio}
            onClick={() => setFilter({ prio: "" })}
            label="Todas"
            count={priorityCounts.total}
          />
          {PRIORITIES.map((priority) => (
            <Chip
              key={priority}
              active={filters.prio === priority}
              onClick={() => setFilter({ prio: filters.prio === priority ? "" : priority })}
              label={PRIORITY_LABEL[priority]}
              count={priorityCounts.counts[priority]}
              color={PRIORITY_COLORS[priority]}
            />
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-sm text-emerald-700 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      <p className="text-xs text-slate-500" aria-live="polite">
        {filtered.length === items.length
          ? `${items.length} inspeç${items.length === 1 ? "ão" : "ões"}`
          : `${filtered.length} de ${items.length} inspeções`}
      </p>

      {items.length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma inspeção registrada ainda.</p>
      )}

      {items.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-600">Nenhuma inspeção encontrada com esses filtros.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-sm text-emerald-700 underline"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.key}>
          {group.label && (
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              {group.label}
            </h3>
          )}
          <ul className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {group.rows.map((item) => (
              <HistoryRow key={item.inspection.id} item={item} />
            ))}
          </ul>
        </section>
      ))}

      {visibleCount < filtered.length && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Carregar mais ({filtered.length - visibleCount} restantes)
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const { inspection, road, kmMin, kmMax, date } = item;
  const [expanded, setExpanded] = useState(false);
  const frames = inspection.frame_analyses;
  const hasFrames = frames.length > 0;

  const frameCounts = useMemo(() => {
    const counts: Record<Priority, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const f of frames) counts[f.priority] += 1;
    return counts;
  }, [frames]);

  // Bloco de 500m do primeiro frame, no formato que a rota de detalhe do
  // trecho espera (/highways/:roadId/trecho/:kmStart).
  const blockStart =
    kmMin !== null ? (Math.floor(kmMin / BLOCK_SIZE_KM) * BLOCK_SIZE_KM).toFixed(1) : null;

  return (
    <li className="p-4 min-w-0">
      <button
        type="button"
        onClick={() => hasFrames && setExpanded((v) => !v)}
        aria-expanded={hasFrames ? expanded : undefined}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            #{inspection.id} · {road?.name ?? "Rodovia desconhecida"}
            {hasFrames && (
              <span className="text-xs text-slate-400 font-normal ml-2">
                {expanded ? "ocultar ▲" : "ver frames ▼"}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {kmMin !== null && kmMax !== null && (
              <>
                km {kmMin.toFixed(1)}
                {kmMax - kmMin >= 0.05 ? `–${kmMax.toFixed(1)}` : ""} ·{" "}
              </>
            )}
            {inspection.direction ? `${LANE_LABEL[inspection.direction]} · ` : ""}
            {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
            {hasFrames ? `${frames.length} frame${frames.length === 1 ? "" : "s"}` : inspection.status}
          </p>
          {hasFrames && <FrameDistribution counts={frameCounts} total={frames.length} />}
        </div>
        <PriorityBadge priority={inspection.priority} />
      </button>

      {expanded && (
        <>
          <div className="mt-1 flex gap-3 overflow-x-auto px-1 pt-3 pb-5">
            {frames.map((frame) => (
              <FrameCard key={frame.frame_index} frame={frame} />
            ))}
          </div>
          {road && blockStart && (
            <Link
              to={`/highways/${road.id}/trecho/${blockStart}`}
              className="text-xs text-emerald-700 underline"
            >
              Ver trecho km {blockStart} em Rodovias →
            </Link>
          )}
        </>
      )}
    </li>
  );
}

// Barrinha proporcional: quantos frames da inspeção são Alta/Média/Baixa.
// Mostra de relance se a prioridade "HIGH" veio de 1 frame ou da maioria.
function FrameDistribution({
  counts,
  total,
}: {
  counts: Record<Priority, number>;
  total: number;
}) {
  return (
    <div
      className="mt-1.5 flex h-1.5 w-40 overflow-hidden rounded-full bg-slate-100"
      title={PRIORITIES.map((p) => `${PRIORITY_LABEL[p]}: ${counts[p]}`).join(" · ")}
    >
      {PRIORITIES.map((p) =>
        counts[p] > 0 ? (
          <div
            key={p}
            style={{ width: `${(counts[p] / total) * 100}%`, backgroundColor: PRIORITY_COLORS[p] }}
          />
        ) : null
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
        active
          ? "border-slate-900 bg-slate-900 text-white dark:text-slate-50"
          : "border-slate-300 bg-white text-slate-600"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
      <span className={active ? "opacity-80" : "text-slate-400"}>{count}</span>
    </button>
  );
}
