import { request } from "./client";
import type { Inspection, LaneDirection } from "./types";

export function listInspections() {
  return request<Inspection[]>("/inspections");
}

export function getInspection(id: number) {
  return request<Inspection>(`/inspections/${id}`);
}

export function resetInspections() {
  return request<void>("/inspections", { method: "DELETE" });
}

export function createInspection(
  segmentId: number,
  file: File,
  direction: LaneDirection,
  range?: { kmStart: number; kmEnd: number }
) {
  const formData = new FormData();
  formData.append("segment_id", String(segmentId));
  formData.append("file", file);
  formData.append("direction", direction);
  if (range) {
    formData.append("km_start", String(range.kmStart));
    formData.append("km_end", String(range.kmEnd));
  }

  return request<Inspection>("/inspections", {
    method: "POST",
    body: formData,
  });
}
