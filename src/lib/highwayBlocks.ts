import type { FrameAnalysis, Inspection, Priority, Segment } from "../api/types";

export const BLOCK_SIZE_KM = 0.5;

export interface HighwayBlock {
  index: number;
  kmStart: number;
  kmEnd: number;
  segmentId: number | null;
  priority: Priority | null;
  frames: FrameAnalysis[];
  inspection: Inspection | null;
}

const SEVERITY: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function worstCase(priorities: Priority[]): Priority | null {
  if (priorities.length === 0) return null;
  return priorities.reduce((worst, p) => (SEVERITY[p] > SEVERITY[worst] ? p : worst));
}

/**
 * Divide o alcance coberto pelos trechos de uma rodovia em blocos de 500m
 * (BLOCK_SIZE_KM), ancorados no km absoluto (não relativo ao trecho) —
 * bate com a convenção real da planilha (0+000, 0+500, 1+000...).
 *
 * Cada bloco herda a prioridade "pior caso" entre os frames da inspeção
 * mais recente do trecho que caem naquele intervalo de km. Bloco sem
 * nenhum frame mapeado fica com priority: null ("sem dado").
 */
export function buildHighwayBlocks(
  segments: Segment[],
  latestBySegment: Map<number, Inspection>
): HighwayBlock[] {
  if (segments.length === 0) return [];

  const sorted = [...segments].sort((a, b) => a.km_start - b.km_start);
  const minKm = Math.min(...sorted.map((s) => s.km_start));
  const maxKm = Math.max(...sorted.map((s) => s.km_end));

  const startIndex = Math.floor(minKm / BLOCK_SIZE_KM);
  const endIndex = Math.ceil(maxKm / BLOCK_SIZE_KM);

  const blocks: HighwayBlock[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    const kmStart = i * BLOCK_SIZE_KM;
    const kmEnd = kmStart + BLOCK_SIZE_KM;
    const segment = sorted.find((s) => kmStart < s.km_end && kmEnd > s.km_start);

    if (!segment) {
      blocks.push({ index: i, kmStart, kmEnd, segmentId: null, priority: null, frames: [], inspection: null });
      continue;
    }

    const inspection = latestBySegment.get(segment.id) ?? null;
    const frames = (inspection?.frame_analyses ?? []).filter(
      (f) => f.estimated_km >= kmStart && f.estimated_km < kmEnd
    );
    const priority = worstCase(frames.map((f) => f.priority));

    blocks.push({ index: i, kmStart, kmEnd, segmentId: segment.id, priority, frames, inspection });
  }

  return blocks;
}
