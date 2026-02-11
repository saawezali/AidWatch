import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  ChevronRight,
  AlertTriangle,
  Zap,
  Activity,
  X,
  SlidersHorizontal,
  Waves,
  Swords,
  Bug,
  Wheat,
  Users,
  Building2,
  TrendingDown,
  Globe,
  Pin,
  type LucideIcon
} from 'lucide-react';
import { crisisApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const severityConfig = {
  CRITICAL: { 
    bg: 'bg-red-100', 
    text: 'text-red-700', 
    border: 'border-red-200',
    dot: 'bg-red-500',
    gradient: 'from-red-500/10 to-transparent'
  },
  HIGH: { 
    bg: 'bg-orange-100', 
    text: 'text-orange-700', 
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    gradient: 'from-orange-500/10 to-transparent'
  },
  MEDIUM: { 
    bg: 'bg-yellow-100', 
    text: 'text-yellow-700', 
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
    gradient: 'from-yellow-500/10 to-transparent'
  },
  LOW: { 
    bg: 'bg-green-100', 
    text: 'text-green-700', 
    border: 'border-green-200',
    dot: 'bg-green-500',
    gradient: 'from-green-500/10 to-transparent'
  },
  UNKNOWN: { 
    bg: 'bg-slate-100', 
    text: 'text-slate-700', 
    border: 'border-slate-200',
    dot: 'bg-slate-500',
    gradient: 'from-slate-500/10 to-transparent'
  },
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

const typeIcons: Record<string, LucideIcon> = {
  NATURAL_DISASTER: Waves,
  CONFLICT: Swords,
  DISEASE_OUTBREAK: Bug,
  FOOD_SECURITY: Wheat,
  DISPLACEMENT: Users,
  INFRASTRUCTURE: Building2,
  ECONOMIC: TrendingDown,
  ENVIRONMENTAL: Globe,
  OTHER: Pin,
};

interface Crisis {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: keyof typeof severityConfig;
  status: string;
  country: string;
  location: string;
  detectedAt: string;
  confidence: number;
}

// Loading skeleton
function CrisisCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-48 h-6 skeleton rounded" />
            <div className="w-20 h-6 skeleton rounded-full" />
          </div>
          <div className="w-full h-4 skeleton rounded" />
          <div className="w-2/3 h-4 skeleton rounded" />
        </div>
        <div className="w-16 h-16 skeleton rounded-xl" />
      </div>
      <div className="flex gap-3">
        <div className="w-32 h-5 skeleton rounded" />
        <div className="w-24 h-5 skeleton rounded" />
      </div>
    </div>
  );
}

export default function CrisisList() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['crises', { search, severity: severityFilter, type: typeFilter }],
    queryFn: () => crisisApi.list({ 
      search: search || undefined, 
      severity: severityFilter || undefined,
      type: typeFilter || undefined,
      limit: 50 
    }),
  });

  const activeFilters = [severityFilter, typeFilter].filter(Boolean).length;

  const clearFilters = () => {
    setSeverityFilter('');
    setTypeFilter('');
  };

  return (
    <div className="space-y-6 animate-fade-in mt-12">
      {/* Header with search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search crises by name, location, or description..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white outline-none transition-all"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 rounded-xl border transition-all font-medium',
              showFilters || activeFilters > 0
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            )}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filters</span>
            {activeFilters > 0 && (
              <span className="px-2 py-0.5 bg-primary-500 text-white text-xs font-bold rounded-full">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Expandable filters */}
        <div className={clsx(
          'grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden transition-all duration-300',
          showFilters ? 'mt-4 max-h-40 opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            >
              <option value="">All Severity Levels</option>
              <option value="CRITICAL">🔴 Critical</option>
              <option value="HIGH">🟠 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Crisis Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            >
              <option value="">All Types</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filters display */}
        {activeFilters > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">Active filters:</span>
            {severityFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm">
                {severityFilter}
                <button onClick={() => setSeverityFilter('')} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {typeFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm">
                {typeLabels[typeFilter]}
                <button onClick={() => setTypeFilter('')} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button 
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {isLoading ? (
            <span className="inline-block w-32 h-4 skeleton rounded" />
          ) : (
            <>
              Showing <span className="font-semibold text-slate-700">{data?.data?.length || 0}</span> crises
            </>
          )}
        </p>
      </div>

      {/* Crisis List */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            <CrisisCardSkeleton />
            <CrisisCardSkeleton />
            <CrisisCardSkeleton />
          </>
        ) : data?.data?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No crises found</h3>
            <p className="text-slate-500 mb-4">
              {search || activeFilters > 0 
                ? 'Try adjusting your search or filters'
                : 'No active crises are currently being monitored'}
            </p>
            {activeFilters > 0 && (
              <button 
                onClick={clearFilters}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          data?.data?.map((crisis: Crisis, index: number) => {
            const config = severityConfig[crisis.severity];
            return (
              <Link
                key={crisis.id}
                to={`/crises/${crisis.id}`}
                className={clsx(
                  'block bg-white rounded-2xl border border-slate-200 overflow-hidden card-hover group',
                  'animate-fade-in-up'
                )}
                style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
              >
                {/* Severity indicator bar */}
                <div className={clsx(
                  'h-1 bg-gradient-to-r',
                  crisis.severity === 'CRITICAL' && 'from-red-500 to-rose-500',
                  crisis.severity === 'HIGH' && 'from-orange-500 to-amber-500',
                  crisis.severity === 'MEDIUM' && 'from-yellow-500 to-lime-500',
                  crisis.severity === 'LOW' && 'from-green-500 to-emerald-500',
                  crisis.severity === 'UNKNOWN' && 'from-slate-400 to-slate-500'
                )} />
                
                <div className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      {/* Title and severity badge */}
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        {crisis.severity === 'CRITICAL' && (
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                          </span>
                        )}
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                          {crisis.title}
                        </h3>
                        <span
                          className={clsx(
                            'px-3 py-1 text-xs font-bold rounded-full border',
                            config.bg, config.text, config.border
                          )}
                        >
                          {crisis.severity}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                          {(() => {
                            const IconComponent = typeIcons[crisis.type] || Pin;
                            return <IconComponent className="h-3 w-3" />;
                          })()}
                          {typeLabels[crisis.type] || crisis.type}
                        </span>
                      </div>
                      
                      {/* Description */}
                      <p className="text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                        {crisis.description}
                      </p>
                      
                      {/* Meta info */}
                      <div className="flex items-center gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{crisis.location || crisis.country || 'Unknown'}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {formatDistanceToNow(new Date(crisis.detectedAt), { addSuffix: true })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-slate-400" />
                          <span className={clsx(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            crisis.status === 'ONGOING' && 'bg-red-100 text-red-700',
                            crisis.status === 'EMERGING' && 'bg-blue-100 text-blue-700',
                            crisis.status === 'DEVELOPING' && 'bg-yellow-100 text-yellow-700',
                            crisis.status === 'STABILIZING' && 'bg-green-100 text-green-700'
                          )}>
                            {crisis.status}
                          </span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Confidence score */}
                    <div className="text-center shrink-0">
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-slate-100"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${crisis.confidence * 176} 176`}
                            className="text-primary-500 transition-all duration-700"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-900">
                            {Math.round(crisis.confidence * 100)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Confidence</p>
                    </div>
                  </div>
                  
                  {/* View details hint */}
                  <div className="flex items-center justify-end text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity -mt-2">
                    View details <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
