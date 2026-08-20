export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

// Nominatim (OpenStreetMap) — busca de endereço gratuita, sem chave de API.
// Uso leve/dev only: respeita o limite de ~1 req/s da política de uso deles,
// então a busca só dispara quando o usuário confirma (botão/Enter), nunca a cada tecla.
export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=pt-BR&q=${encodeURIComponent(
    query
  )}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Falha ao buscar endereço");
  }

  const results: NominatimResult[] = await response.json();
  return results.map((r) => ({
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}
