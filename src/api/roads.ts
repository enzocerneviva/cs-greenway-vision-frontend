import { request } from "./client";
import type { Road, Segment } from "./types";

export function listRoads() {
  return request<Road[]>("/roads");
}

export function createRoad(name: string) {
  return request<Road>("/roads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function listSegments() {
  return request<Segment[]>("/segments");
}

export function createSegment(input: {
  road_id: number;
  km_start: number;
  km_end: number;
  direction: string;
}) {
  return request<Segment>("/segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
