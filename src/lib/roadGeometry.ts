const KM_PER_DEGREE = 111; // aproximação, mesma usada no resto do projeto

/**
 * Mapeia uma posição em km pra um ponto ao longo do traçado real buscado no
 * OpenStreetMap — por distância real acumulada a partir do início do
 * traçado (tratado como km 0), não por esticar o traçado inteiro
 * proporcionalmente ao intervalo do trecho.
 *
 * Isso importa porque o traçado encontrado no OSM costuma ser mais longo
 * que a concessão registrada (ex.: a Anhanguera no OSM é o corredor
 * inteiro até a divisa com MG, ~450km, mesmo a concessão sendo só km
 * 11-158) — esticar proporcionalmente distorceria a posição de cada bloco.
 * O backend já orienta o traçado pra ponta mais próxima de São Paulo vir
 * primeiro (ver app/services/geocoding_service.py).
 */
export function createRoadKmMapper(geometry: [number, number][]) {
  const cumDistKm: number[] = [0];
  for (let i = 1; i < geometry.length; i++) {
    const [lat1, lng1] = geometry[i - 1];
    const [lat2, lng2] = geometry[i];
    cumDistKm.push(cumDistKm[i - 1] + Math.hypot(lat2 - lat1, lng2 - lng1) * KM_PER_DEGREE);
  }
  const maxKm = cumDistKm[cumDistKm.length - 1] || 0;

  function pointAtKm(km: number): [number, number] {
    const target = Math.max(0, Math.min(km, maxKm));
    let i = 1;
    while (i < cumDistKm.length - 1 && cumDistKm[i] < target) i++;
    const segLen = cumDistKm[i] - cumDistKm[i - 1] || 1;
    const segFrac = (target - cumDistKm[i - 1]) / segLen;
    const [lat1, lng1] = geometry[i - 1];
    const [lat2, lng2] = geometry[i];
    return [lat1 + (lat2 - lat1) * segFrac, lng1 + (lng2 - lng1) * segFrac];
  }

  return {
    sliceByKm(kmStart: number, kmEnd: number): [number, number][] {
      const points: [number, number][] = [pointAtKm(kmStart)];
      for (let i = 0; i < cumDistKm.length; i++) {
        if (cumDistKm[i] > kmStart && cumDistKm[i] < kmEnd) points.push(geometry[i]);
      }
      points.push(pointAtKm(kmEnd));
      return points;
    },
  };
}

/**
 * Desloca uma linha perpendicularmente à sua própria direção local, por
 * uma distância fixa (em km) — usado pra desenhar as duas pistas de uma
 * rodovia (Capital/Interior) como duas linhas paralelas visualmente
 * separadas, já que só reconstruímos um traçado central único a partir
 * do OSM (ver geocoding_service.py).
 */
export function offsetPerpendicular(
  points: [number, number][],
  offsetKm: number
): [number, number][] {
  if (points.length < 2) return points;
  const offsetDeg = offsetKm / KM_PER_DEGREE;

  return points.map((point, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dLat = next[0] - prev[0];
    const dLng = next[1] - prev[1];
    const len = Math.hypot(dLat, dLng) || 1;
    // vetor perpendicular unitário (rotaciona a tangente 90°)
    const normalLat = -dLng / len;
    const normalLng = dLat / len;
    return [point[0] + normalLat * offsetDeg, point[1] + normalLng * offsetDeg];
  });
}
