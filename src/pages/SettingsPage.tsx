import { useState } from "react";
import { resetInspections } from "../api/inspections";

export function SettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  async function handleReset() {
    setResetting(true);
    setResult(null);
    try {
      await resetInspections();
      setResult("success");
      setConfirming(false);
    } catch {
      setResult("error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Configurações</h1>

      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <h2 className="font-semibold text-slate-900">Resetar análises</h2>
        <p className="text-sm text-slate-500 mt-1">
          Apaga todas as inspeções, frames analisados e vídeos enviados — a faixa de blocos e o
          mapa voltam pro estado "sem inspeção" (cinza). Rodovias e trechos cadastrados não são
          afetados.
        </p>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 rounded-md border border-red-300 text-red-600 text-sm font-medium px-4 py-2 hover:bg-red-50"
          >
            Resetar análises
          </button>
        ) : (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700 font-medium">
              Tem certeza? Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="rounded-md bg-red-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
              >
                {resetting ? "Resetando..." : "Sim, apagar tudo"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={resetting}
                className="rounded-md border border-slate-300 text-sm font-medium px-4 py-2 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {result === "success" && (
          <p className="text-sm text-emerald-700 mt-3">Análises resetadas com sucesso.</p>
        )}
        {result === "error" && (
          <p className="text-sm text-red-600 mt-3">
            Não foi possível resetar — confira se o backend está rodando.
          </p>
        )}
      </section>
    </div>
  );
}
