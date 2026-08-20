import type { FrameAnalysis, Inspection, LaneDirection, Priority, Segment } from "../api/types";

export const BLOCK_SIZE_KM = 0.5;

export const LANES: LaneDirection[] = ["CAPITAL", "INTERIOR"];

export const LANE_LABEL: Record<LaneDirection, string> = {
  CAPITAL: "Sentido Capital",
  INTERIOR: "Sentido Interior",
};

export interface LaneData {
  priority: Priority | null;
  frames: FrameAnalysis[];
  inspection: Inspection | null;
}

export interface HighwayBlock {
  index: number;
  kmStart: number;
  kmEnd: number;
  segmentId: number | null;
  lanes: Record<LaneDirection, LaneData>;
}

const SEVERITY: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function worstCase(priorities: Priority[]): Priority | null {
  if (priorities.length === 0) return null;
  return priorities.reduce((worst, p) => (SEVERITY[p] > SEVERITY[worst] ? p : worst));
}

function buildLaneData(
  inspections: Inspection[],
  lane: LaneDirection,
  kmStart: number,
  kmEnd: number
): LaneData {
  const laneInspections = inspections.filter((i) => i.direction === lane);

  let bestInspection: Inspection | null = null;
  for (const inspection of laneInspections) {
    const hasFrameHere = inspection.frame_analyses.some(
      (f) => f.estimated_km >= kmStart && f.estimated_km < kmEnd
    );
    if (!hasFrameHere) continue;
    if (!bestInspection || inspection.created_at > bestInspection.created_at) {
      bestInspection = inspection;
    }
  }

  const frames = (bestInspection?.frame_analyses ?? []).filter(
    (f) => f.estimated_km >= kmStart && f.estimated_km < kmEnd
  );
  const priority = worstCase(frames.map((f) => f.priority));

  return { priority, frames, inspection: bestInspection };
}

/**
 * Divide o alcance coberto pelos trechos de uma rodovia em blocos de 500m
 * (BLOCK_SIZE_KM), ancorados no km absoluto (não relativo ao trecho) —
 * bate com a convenção real da planilha (0+000, 0+500, 1+000...).
 *
 * Cada bloco tem duas "faixas" independentes (CAPITAL / INTERIOR) — a
 * vegetação pode estar em condição bem diferente de cada lado da pista,
 * então elas não se misturam. Cada faixa pega o dado da inspeção mais
 * recente daquele sentido que efetivamente cobre aquele km.
 */
export function buildHighwayBlocks(
  segments: Segment[],
  inspectionsBySegment: Map<number, Inspection[]>
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
      blocks.push({
        index: i,
        kmStart,
        kmEnd,
        segmentId: null,
        lanes: {
          CAPITAL: { priority: null, frames: [], inspection: null },
          INTERIOR: { priority: null, frames: [], inspection: null },
        },
      });
      continue;
    }

    const inspections = inspectionsBySegment.get(segment.id) ?? [];
    blocks.push({
      index: i,
      kmStart,
      kmEnd,
      segmentId: segment.id,
      lanes: {
        CAPITAL: buildLaneData(inspections, "CAPITAL", kmStart, kmEnd),
        INTERIOR: buildLaneData(inspections, "INTERIOR", kmStart, kmEnd),
      },
    });
  }

  return blocks;
}
