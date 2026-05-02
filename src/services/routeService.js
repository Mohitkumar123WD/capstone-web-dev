import axios from 'axios';

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function fetchRoute(start, end) {
  const response = await axios.get(`${OSRM_ROUTE_URL}/${start[1]},${start[0]};${end[1]},${end[0]}`, {
    params: {
      overview: 'full',
      geometries: 'geojson',
      alternatives: false,
      steps: false,
    },
    timeout: 15000,
  });

  const route = response.data?.routes?.[0];

  if (!route) {
    throw new Error('Route could not be calculated.');
  }

  return {
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: Math.round(route.distance),
    duration: Math.round(route.duration),
    summary: route?.legs?.[0]?.summary || '',
  };
}

export function getDistanceMeters(pointA, pointB) {
  const toRad = (value) => (value * Math.PI) / 180;
  const [lat1, lon1] = pointA;
  const [lat2, lon2] = pointB;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getClosestVehicle(vehicles, target) {
  if (!vehicles.length) return null;
  return vehicles.reduce((best, vehicle) => {
    const distance = getDistanceMeters(vehicle.position, target);
    if (!best || distance < best.distance) {
      return { ...vehicle, distance };
    }
    return best;
  }, null);
}
