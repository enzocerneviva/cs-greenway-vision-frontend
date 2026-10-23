import { useMemo, useState } from "react";
import { BLOCK_SIZE_KM } from "../../lib/highwayBlocks";
import type { Segment } from "../../api/types";
import { Tooltip } from "../ui/Tooltip";

export interface KmRange {
  kmStart: number;
  kmEnd: number;
}

/**
 * Seletor visual de qual pedaço do trecho um upload cobre. Clique no
 * primeiro bloco marca o início, clique no segundo marca o fim (a ordem
 * não importa, ele reordena sozinho) — mesma lógica de "clique 2 pontos"
 * já usada no LocationPicker do mapa.
 *
 * single=true trava em 1 bloco só (clique sempre substitui a seleção
 * anterior) — usado pra foto, que representa um único ponto.
 */
export function BlockRangePicker({
  segment,
  single = false,
  onChange,
}: {
  segment: Segment | undefined;
  single?: boolean;
  onChange: (range: KmRange | null) => void;
}) {
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);

  const blocks = useMemo(() => {
    if (!segment) return [];
    const result: number[] = [];
    for (let km = segment.km_start; km < segment.km_end; km += BLOCK_SIZE_KM) {
      result.push(km);
    }
    return result;
  }, [segment]);

  function emit(a: number | null, b: number | null) {
    if (a === null || b === null) {
      onChange(null);
      return;
    }
    const kmStart = Math.min(a, b);
    const kmEnd = Math.max(a, b) + BLOCK_SIZE_KM;
    onChange({ kmStart, kmEnd });
  }

  function handleClick(blockKm: number) {
    if (single) {
      setStart(blockKm);
      setEnd(blockKm);
      emit(blockKm, blockKm);
      return;
    }

    if (start === null || (start !== null && end !== null)) {
      setStart(blockKm);
      setEnd(null);
      onChange(null);
    } else {
      setEnd(blockKm);
      emit(start, blockKm);
    }
  }

  function handleUseWholeSegment() {
    if (!segment) return;
    setStart(segment.km_start);
    setEnd(segment.km_end - BLOCK_SIZE_KM);
    onChange({ kmStart: segment.km_start, kmEnd: segment.km_end });
  }

  function handleClear() {
    setStart(null);
    setEnd(null);
    onChange(null);
  }

  if (!segment) return null;

  const lo = start !== null && end !== null ? Math.min(start, end) : start;
  const hi = start !== null && end !== null ? Math.max(start, end) : start;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-slate-500">
          {single
            ? "Clique no bloco que essa foto representa"
            : start === null
            ? "Clique no bloco onde o vídeo começa"
            : end === null
            ? "Agora clique no bloco onde o vídeo termina"
            : "Intervalo selecionado — clique pra recomeçar"}
        </p>
        {!single && (
          <button
            type="button"
            onClick={handleUseWholeSegment}
            className="text-xs text-emerald-700 underline shrink-0"
          >
            usar trecho inteiro
          </button>
        )}
      </div>

      <div className="flex gap-0.5 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-2">
        {blocks.map((blockKm) => {
          const inRange = lo !== null && hi !== null && blockKm >= lo && blockKm <= hi;
          return (
            <Tooltip
              key={blockKm}
              content={`km ${blockKm.toFixed(1)} – ${(blockKm + BLOCK_SIZE_KM).toFixed(1)}`}
            >
              <button
                type="button"
                aria-label={`Bloco km ${blockKm.toFixed(1)} a ${(blockKm + BLOCK_SIZE_KM).toFixed(1)}`}
                onClick={() => handleClick(blockKm)}
                className={`h-8 w-2.5 shrink-0 rounded-sm transition-colors ${
                  inRange ? "bg-emerald-500" : "bg-slate-200 hover:bg-slate-300"
                }`}
              />
            </Tooltip>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <p className="text-xs text-slate-500">
          {lo !== null && hi !== null
            ? `km ${lo.toFixed(1)} – ${(hi + BLOCK_SIZE_KM).toFixed(1)}`
            : `km ${segment.km_start.toFixed(1)} – ${segment.km_end.toFixed(1)} (trecho inteiro)`}
        </p>
        {start !== null && (
          <button type="button" onClick={handleClear} className="text-xs text-slate-400 underline">
            limpar
          </button>
        )}
      </div>
    </div>
  );
}
