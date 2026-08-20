export interface Road {
  id: number;
  name: string;
}

export interface Segment {
  id: number;
  road_id: number;
  km_start: number;
  km_end: number;
  direction: string;
  lat_start: number | null;
  lng_start: number | null;
  lat_end: number | null;
  lng_end: number | null;
}

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface FrameAnalysis {
  frame_index: number;
  timestamp_seconds: number;
  estimated_km: number;
  green_percent: number;
  priority: Priority;
}

export interface Inspection {
  id: number;
  video_id: number;
  segment_id: number;
  measurement_value: number | null;
  measurement_unit: string | null;
  priority: Priority | null;
  model_version: string | null;
  status: string;
  analyzed_at: string | null;
  created_at: string;
  frame_analyses: FrameAnalysis[];
}
