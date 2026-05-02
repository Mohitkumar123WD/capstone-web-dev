import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { fetchRoute, getClosestVehicle, getDistanceMeters } from '../services/routeService';
import './MapView.css';

const routeStops = [
  { id: 'A', name: 'Central Station', position: [28.6733, 77.4197] },
  { id: 'B', name: 'Market Square', position: [28.6706, 77.4246] },
  { id: 'C', name: 'Park Avenue', position: [28.6672, 77.4214] },
  { id: 'D', name: 'Tech Hub', position: [28.6621, 77.4143] },
  { id: 'E', name: 'City Airport', position: [28.6581, 77.4081] },
];

const transitRoute = [
  [28.6733, 77.4197],
  [28.6720, 77.4218],
  [28.6706, 77.4246],
  [28.6688, 77.4239],
  [28.6672, 77.4214],
  [28.6650, 77.4180],
  [28.6637, 77.4152],
  [28.6621, 77.4143],
  [28.6600, 77.4115],
  [28.6581, 77.4081],
];

const vehicleIcon = L.divIcon({
  className: 'vehicle-marker',
  html: '<span>🚌</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const stopIcon = L.divIcon({
  className: 'stop-marker',
  html: '<span>•</span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const initialVehicles = [
  { id: 1, name: 'Bus 101', stepIndex: 0, progress: 0, speed: 0.015, position: transitRoute[0] },
  { id: 2, name: 'Bus 102', stepIndex: 3, progress: 0.35, speed: 0.012, position: transitRoute[3] },
  { id: 3, name: 'Bus 103', stepIndex: 6, progress: 0.2, speed: 0.018, position: transitRoute[6] },
];

function interpolatePoint(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function moveVehicle(vehicle) {
  const nextIndex = Math.min(vehicle.stepIndex + 1, transitRoute.length - 1);
  const segmentStart = transitRoute[vehicle.stepIndex];
  const segmentEnd = transitRoute[nextIndex];
  let nextProgress = vehicle.progress + vehicle.speed;
  let nextStepIndex = vehicle.stepIndex;

  if (nextProgress >= 1) {
    nextProgress -= 1;
    nextStepIndex = nextIndex;
  }

  const finalIndex = Math.min(nextStepIndex, transitRoute.length - 1);
  const finalNextIndex = Math.min(finalIndex + 1, transitRoute.length - 1);
  const position = interpolatePoint(
    transitRoute[finalIndex],
    transitRoute[finalNextIndex],
    Math.min(nextProgress, 1)
  );

  return {
    ...vehicle,
    stepIndex: finalIndex,
    progress: Math.min(nextProgress, 1),
    position,
  };
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function formatDistance(distance) {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} km`;
  }

  return `${distance} m`;
}

export default function MapView() {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [selectedStart, setSelectedStart] = useState(routeStops[0].id);
  const [selectedEnd, setSelectedEnd] = useState(routeStops[routeStops.length - 1].id);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVehicles((current) => current.map(moveVehicle));
    }, 900);

    return () => window.clearInterval(timer);
  }, []);

  const selectedStartStop = useMemo(
    () => routeStops.find((stop) => stop.id === selectedStart),
    [selectedStart]
  );

  const selectedEndStop = useMemo(
    () => routeStops.find((stop) => stop.id === selectedEnd),
    [selectedEnd]
  );

  const onOptimize = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!selectedStartStop || !selectedEndStop) {
        throw new Error('Please select both start and end stops.');
      }

      if (selectedStart === selectedEnd) {
        throw new Error('Select two different stops to optimize a route.');
      }

      const route = await fetchRoute(selectedStartStop.position, selectedEndStop.position);
      const closestVehicle = getClosestVehicle(vehicles, selectedStartStop.position);
      const travelDistance = closestVehicle
        ? getDistanceMeters(closestVehicle.position, selectedStartStop.position)
        : 0;
      const estimatedArrival = Math.max(1, Math.round(travelDistance / 300));

      setRouteData({
        ...route,
        start: selectedStartStop,
        end: selectedEndStop,
        closestVehicle,
        arrivalMinutes: estimatedArrival,
      });
    } catch (err) {
      setError(err?.message || 'Unable to optimize route.');
      setRouteData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="map-page">
      <div className="route-sidebar">
        <h2>Live Transit Route Optimizer</h2>
        <form onSubmit={onOptimize}>
          <label>
            Start stop
            <select
              value={selectedStart}
              onChange={(event) => setSelectedStart(event.target.value)}
            >
              {routeStops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Destination stop
            <select
              value={selectedEnd}
              onChange={(event) => setSelectedEnd(event.target.value)}
            >
              {routeStops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Optimizing…' : 'Optimize route'}
          </button>
        </form>

        {error && (
          <div className="route-preview" style={{ color: '#b91c1c' }}>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        )}

        {routeData && (
          <div className="route-preview">
            <strong>Optimized route</strong>
            <div className="route-summary">
              <span>{routeData.start.name} → {routeData.end.name}</span>
              <span>Distance: {formatDistance(routeData.distance)}</span>
              <span>Travel time: {formatDuration(routeData.duration)}</span>
              {routeData.closestVehicle && (
                <span>
                  Nearest vehicle: {routeData.closestVehicle.name} ({formatDistance(Math.round(routeData.closestVehicle.distance))} away, estimated arrival {routeData.arrivalMinutes} min)
                </span>
              )}
            </div>
            <div className="route-highlight">
              <span>Transit route shown in gray</span>
              <span>Recommended route shown in blue</span>
            </div>
          </div>
        )}
      </div>

      <MapContainer className="transport-map" center={[28.67, 77.42]} zoom={14} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polyline positions={transitRoute} pathOptions={{ color: '#9ca3af', weight: 6, opacity: 0.7 }} />

        {routeStops.map((stop) => (
          <Marker key={stop.id} position={stop.position} icon={stopIcon}>
            <Popup>
              <strong>{stop.name}</strong>
              <p>Stop ID: {stop.id}</p>
            </Popup>
            <Tooltip direction="top" offset={[0, -14]} opacity={1} permanent>
              {stop.name}
            </Tooltip>
          </Marker>
        ))}

        {vehicles.map((vehicle) => (
          <Marker key={vehicle.id} position={vehicle.position} icon={vehicleIcon}>
            <Popup>
              <strong>{vehicle.name}</strong>
              <p>Current speed: {(vehicle.speed * 40).toFixed(1)} km/h</p>
            </Popup>
          </Marker>
        ))}

        {routeData?.geometry && (
          <Polyline positions={routeData.geometry} pathOptions={{ color: '#2563eb', weight: 5, dashArray: '8 6' }} />
        )}
      </MapContainer>
    </section>
  );
}
