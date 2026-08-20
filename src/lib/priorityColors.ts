import type { Priority } from "../api/types";

export const PRIORITY_COLORS: Record<Priority | "NONE", string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  NONE: "#94a3b8",
};
