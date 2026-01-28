import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Clock } from 'lucide-react';
import { crisisApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const severityColors = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200',
  UNKNOWN: 'bg-slate-100 text-slate-800 border-slate-200',
};

const typeLabels: Record<string, string> = {
  NATURAL_DISASTER: 'Natural Disaster',
  CONFLICT: 'Conflict',
  DISEASE_OUTBREAK: 'Disease Outbreak',
  FOOD_SECURITY: 'Food Security',
  DISPLACEMENT: 'Displacement',
  INFRASTRUCTURE: 'Infrastructure',
  ECONOMIC: 'Economic',
  ENVIRONMENTAL: 'Environmental',
  OTHER: 'Other',
};

interface Crisis {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: keyof typeof severityColors;
  status: string;
  country: string;
  location: string;
  detectedAt: string;
  confidence: number;
}

export default function CrisisList() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['crises', { search, severity: severityFilter, type: typeFilter }],
    queryFn: () => crisisApi.list({ 
      search: search || undefined, 
      severity: severityFilter || undefined,
      type: typeFilter || undefined,
      limit: 50 
    }),
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search crises..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="">All Severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="">All Types</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Crisis List */}
      <div className="bg-white rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading crises...</div>
        ) : data?.data?.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No crises found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data?.data?.map((crisis: Crisis) => (
              <Link
                key={crisis.id}
                to={`/crises/${crisis.id}`}
                className="block p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{crisis.title}</h3>
                      <span
                        className={clsx(
                          'px-2.5 py-0.5 text-xs font-medium rounded-full border',
                          severityColors[crisis.severity]
                        )}
                      >
                        {crisis.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2 mb-3">{crisis.description}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {crisis.location || crisis.country || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(crisis.detectedAt), { addSuffix: true })}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {typeLabels[crisis.type] || crisis.type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Confidence</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {Math.round(crisis.confidence * 100)}%
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
