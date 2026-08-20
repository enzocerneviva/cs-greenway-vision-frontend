import { useMemo } from "react";
import { useAsync } from "../hooks/useAsync";
import { listInspections } from "../api/inspections";
import type { Priority } from "../api/types";

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export function DashboardPage() {
  const { data: inspections, loading, error } = useAsync(listInspections, []);

  const stats = useMemo(() => {
    const list = inspections ?? [];
    const counts: Record<Priority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const inspection of list) {
      if (inspection.priority) counts[inspection.priority] += 1;
    }
    return { total: list.length, counts };
  }, [inspections]);

  if (loading) return <p className="text-sm text-slate-500">Carregando...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total de inspeções" value={stats.total} />
      {(Object.keys(PRIORITY_LABELS) as Priority[]).map((priority) => (
        <StatCard
          key={priority}
          label={`Criticidade ${PRIORITY_LABELS[priority]}`}
          value={stats.counts[priority]}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
