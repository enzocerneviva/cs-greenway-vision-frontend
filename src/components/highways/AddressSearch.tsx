import { useState } from "react";
import { searchAddress, type GeocodeResult } from "../../lib/geocode";

export function AddressSearch({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const found = await searchAddress(query.trim());
      setResults(found);
      if (found.length === 0) setError("Nenhum resultado encontrado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(result: GeocodeResult) {
    onSelect(result.lat, result.lng);
    setResults([]);
    setQuery(result.displayName);
  }

  return (
    <div className="mb-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar rua, cidade, endereço..."
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {loading ? "..." : "Buscar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {results.length > 0 && (
        <ul className="mt-1 border border-slate-200 rounded-md divide-y divide-slate-100 max-h-32 overflow-auto bg-white">
          {results.map((result, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left text-xs px-2 py-1.5 hover:bg-slate-50"
              >
                {result.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
