import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { crisisApi } from '../lib/api';
import clsx from 'clsx';
import 'leaflet/dist/leaflet.css';

const severityColors = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#16a34a',
  UNKNOWN: '#64748b',
};

const severityRadius = {
  CRITICAL: 15,
  HIGH: 12,
  MEDIUM: 10,
  LOW: 8,
  UNKNOWN: 6,
};

interface Crisis {
  id: string;
  title: string;
  severity: keyof typeof severityColors;
  status: string;
  latitude: number | null;
  longitude: number | null;
  country: string;
  location: string;
}

export default function MapView() {
  const [mapReady, setMapReady] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['crises-map'],
    queryFn: () => crisisApi.list({ limit: 100 }),
  });

  useEffect(() => {
    // Delay map rendering to avoid SSR issues
    setMapReady(true);
  }, []);

  const crisesWithLocation = (data?.data || []).filter(
    (c: Crisis) => c.latitude && c.longitude
  );

  if (!mapReady) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-slate-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-sm font-medium text-slate-700">Severity:</span>
          {Object.entries(severityColors).map(([severity, color]) => (
            <div key={severity} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-slate-600">{severity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[calc(100vh-280px)]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            Loading crisis data...
          </div>
        ) : (
          <MapContainer
            center={[10, 20]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {crisesWithLocation.map((crisis: Crisis) => (
              <CircleMarker
                key={crisis.id}
                center={[crisis.latitude!, crisis.longitude!]}
                radius={severityRadius[crisis.severity]}
                pathOptions={{
                  color: severityColors[crisis.severity],
                  fillColor: severityColors[crisis.severity],
                  fillOpacity: 0.6,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-semibold text-slate-900 mb-1">{crisis.title}</h3>
                    <p className="text-sm text-slate-600 mb-2">
                      {crisis.location || crisis.country}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={clsx(
                          'px-2 py-0.5 text-xs font-medium rounded',
                          crisis.severity === 'CRITICAL' && 'bg-red-100 text-red-800',
                          crisis.severity === 'HIGH' && 'bg-orange-100 text-orange-800',
                          crisis.severity === 'MEDIUM' && 'bg-yellow-100 text-yellow-800',
                          crisis.severity === 'LOW' && 'bg-green-100 text-green-800'
                        )}
                      >
                        {crisis.severity}
                      </span>
                      <span className="text-xs text-slate-500">{crisis.status}</span>
                    </div>
                    <Link
                      to={`/crises/${crisis.id}`}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      View details →
                    </Link>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Crisis count */}
      <div className="text-sm text-slate-500 text-center">
        Showing {crisesWithLocation.length} crises with location data
      </div>
    </div>
  );
}
