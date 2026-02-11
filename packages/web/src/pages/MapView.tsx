import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { crisisApi } from '../lib/api';
import { 
  Map, 
  Layers, 
  AlertTriangle, 
  Clock, 
  MapPin,
  ExternalLink,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import 'leaflet/dist/leaflet.css';

const severityConfig = {
  CRITICAL: { color: '#dc2626', radius: 16, pulse: true },
  HIGH: { color: '#ea580c', radius: 13, pulse: false },
  MEDIUM: { color: '#ca8a04', radius: 10, pulse: false },
  LOW: { color: '#16a34a', radius: 8, pulse: false },
  UNKNOWN: { color: '#64748b', radius: 6, pulse: false },
};

interface Crisis {
  id: string;
  title: string;
  description: string;
  severity: keyof typeof severityConfig;
  status: string;
  latitude: number | null;
  longitude: number | null;
  country: string;
  location: string;
  detectedAt: string;
}

export default function MapView() {
  const [mapReady, setMapReady] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['crises-map'],
    queryFn: () => crisisApi.list({ limit: 100 }),
  });

  useEffect(() => {
    setMapReady(true);
  }, []);

  const allCrises = (data?.data || []).filter(
    (c: Crisis) => c.latitude && c.longitude
  ) as Crisis[];

  const crisesWithLocation = selectedSeverity
    ? allCrises.filter(c => c.severity === selectedSeverity)
    : allCrises;

  // Group by severity for stats
  const severityCounts = allCrises.reduce((acc, c) => {
    acc[c.severity] = (acc[c.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!mapReady) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 h-[calc(100vh-200px)] flex items-center justify-center mt-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center animate-pulse">
            <Map className="h-6 w-6 text-primary-600" />
          </div>
          <p className="text-slate-500">Initializing map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'space-y-4 animate-fade-in mt-12',
      isFullscreen && 'fixed inset-0 z-50 bg-slate-900 p-4 mt-0'
    )}>
      {/* Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Title and stats */}
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary-100 rounded-xl">
              <Map className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Global Crisis Map</h2>
              <p className="text-sm text-slate-500">
                {allCrises.length} active situations with location data
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-slate-100 text-slate-600 hover:bg-slate-200',
                isFetching && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw className={clsx('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
          </div>
        </div>

        {/* Severity filter */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <span className="text-sm text-slate-500 mr-2">Filter by severity:</span>
          <button
            onClick={() => setSelectedSeverity(null)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              !selectedSeverity
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            All ({allCrises.length})
          </button>
          {Object.entries(severityConfig).map(([severity, config]) => {
            const count = severityCounts[severity] || 0;
            if (count === 0) return null;
            return (
              <button
                key={severity}
                onClick={() => setSelectedSeverity(selectedSeverity === severity ? null : severity)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  selectedSeverity === severity
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
                style={selectedSeverity === severity ? { backgroundColor: config.color } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                {severity} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className={clsx(
        'bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm',
        isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[calc(100vh-320px)]'
      )}>
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
              <Layers className="h-8 w-8 text-slate-400" />
            </div>
            <p>Loading crisis data...</p>
          </div>
        ) : (
          <MapContainer
            center={[15, 20]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={false}
          >
            <ZoomControl position="bottomright" />
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {crisesWithLocation.map((crisis: Crisis) => {
              const config = severityConfig[crisis.severity];
              return (
                <CircleMarker
                  key={crisis.id}
                  center={[crisis.latitude!, crisis.longitude!]}
                  radius={config.radius}
                  pathOptions={{
                    color: config.color,
                    fillColor: config.color,
                    fillOpacity: 0.6,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="min-w-[280px] -m-1">
                      {/* Header with severity indicator */}
                      <div 
                        className="h-2 -mx-4 -mt-4 mb-3 rounded-t"
                        style={{ backgroundColor: config.color }}
                      />
                      
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          <AlertTriangle 
                            className="h-5 w-5" 
                            style={{ color: config.color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-base leading-tight mb-1">
                            {crisis.title}
                          </h3>
                          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                            {crisis.description}
                          </p>
                        </div>
                      </div>

                      {/* Location and time info */}
                      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {crisis.location || crisis.country}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {formatDistanceToNow(new Date(crisis.detectedAt), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Status badges */}
                      <div className="flex items-center gap-2 mt-3">
                        <span
                          className="px-2.5 py-1 text-xs font-bold rounded-full"
                          style={{ 
                            backgroundColor: `${config.color}15`,
                            color: config.color
                          }}
                        >
                          {crisis.severity}
                        </span>
                        <span className={clsx(
                          'px-2.5 py-1 text-xs font-medium rounded-full',
                          crisis.status === 'ONGOING' && 'bg-red-100 text-red-700',
                          crisis.status === 'EMERGING' && 'bg-blue-100 text-blue-700',
                          crisis.status === 'DEVELOPING' && 'bg-yellow-100 text-yellow-700',
                          crisis.status === 'STABILIZING' && 'bg-green-100 text-green-700'
                        )}>
                          {crisis.status}
                        </span>
                      </div>

                      {/* View details link */}
                      <Link
                        to={`/crises/${crisis.id}`}
                        className="flex items-center justify-center gap-2 mt-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        View Details
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <Layers className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Legend:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {Object.entries(severityConfig).map(([severity, config]) => (
              <div key={severity} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ 
                    backgroundColor: config.color,
                    boxShadow: `0 0 0 2px ${config.color}30`
                  }}
                />
                <span className="text-sm text-slate-600">{severity}</span>
              </div>
            ))}
          </div>
          <div className="text-sm text-slate-400">
            Marker size indicates severity level
          </div>
        </div>
      </div>
    </div>
  );
}
