/**
 * Mapeia uma posição em km (dentro do alcance total da rodovia) pra um
 * ponto ao longo do traçado real buscado no OpenStreetMap — por distância
 * proporcional, mesma aproximação já usada pra posicionar frame dentro de
 * um Segment (não é marco quilométrico oficial).
 */
export function createRoadKmMapper(
  geometry: [number, number][],
  roadMinKm: number,
  roadMaxKm: number
) {
  const cumDist: number[] = [0];
  for (let i = 1; i < geometry.length; i++) {
    const [lat1, lng1] = geometry[i - 1];
    const [lat2, lng2] = geometry[i];
    cumDist.push(cumDist[i - 1] + Math.hypot(lat2 - lat1, lng2 - lng1));
  }
  const total = cumDist[cumDist.length - 1] || 1;
  const kmRange = roadMaxKm - roadMinKm || 1;

  function distanceAtKm(km: number): number {
    const fraction = (km - roadMinKm) / kmRange;
    return Math.max(0, Math.min(1, fraction)) * total;
  }

  function pointAtDistance(targetDist: number): [number, number] {
    let i = 1;
    while (i < cumDist.length - 1 && cumDist[i] < targetDist) i++;
    const segLen = cumDist[i] - cumDist[i - 1] || 1;
    const segFrac = (targetDist - cumDist[i - 1]) / segLen;
    const [lat1, lng1] = geometry[i - 1];
    const [lat2, lng2] = geometry[i];
    return [lat1 + (lat2 - lat1) * segFrac, lng1 + (lng2 - lng1) * segFrac];
  }

  return {
    sliceByKm(kmStart: number, kmEnd: number): [number, number][] {
      const startDist = distanceAtKm(kmStart);
      const endDist = distanceAtKm(kmEnd);
      const points: [number, number][] = [pointAtDistance(startDist)];
      for (let i = 0; i < cumDist.length; i++) {
        if (cumDist[i] > startDist && cumDist[i] < endDist) points.push(geometry[i]);
      }
      points.push(pointAtDistance(endDist));
      return points;
    },
  };
}
