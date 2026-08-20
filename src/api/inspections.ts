import { request } from "./client";
import type { Inspection } from "./types";

export function listInspections() {
  return request<Inspection[]>("/inspections");
}

export function getInspection(id: number) {
  return request<Inspection>(`/inspections/${id}`);
}

export function createInspection(segmentId: number, file: File, km?: number) {
  const formData = new FormData();
  formData.append("segment_id", String(segmentId));
  formData.append("file", file);
  if (km !== undefined) formData.append("km", String(km));

  return request<Inspection>("/inspections", {
    method: "POST",
    body: formData,
  });
}
