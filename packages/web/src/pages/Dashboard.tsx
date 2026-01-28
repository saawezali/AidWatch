import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  TrendingUp, 
  Globe, 
  Activity,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { crisisApi } from '../lib/api';
import clsx from 'clsx';

const severityColors = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200',
  UNKNOWN: 'bg-slate-100 text-slate-800 border-slate-200',
};

const statusLabels = {
  EMERGING: 'Emerging',
  DEVELOPING: 'Developing',
  ONGOING: 'Ongoing',
  STABILIZING: 'Stabilizing',
  RESOLVED: 'Resolved',
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['crisis-stats'],
    queryFn: crisisApi.getStats,
  });

  const { data: crises, isLoading: crisesLoading } = useQuery({
    queryKey: ['crises', { limit: 5, sortBy: 'severity' }],
    queryFn: () => crisisApi.list({ limit: 5, sortBy: 'severity', sortOrder: 'asc' }),
  });

  const statCards = [
    {
      title: 'Active Crises',
      value: stats?.data?.total || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Critical',
      value: stats?.data?.bySeverity?.CRITICAL || 0,
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'New This Week',
      value: stats?.data?.recentCount || 0,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Regions Affected',
      value: Object.keys(stats?.data?.byType || {}).length,
      icon: Globe,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {statsLoading ? '-' : stat.value}
                </p>
              </div>
              <div className={clsx('p-3 rounded-xl', stat.bg)}>
                <stat.icon className={clsx('h-6 w-6', stat.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Crises */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Priority Crises</h2>
            <Link 
              to="/crises" 
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {crisesLoading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : crises?.data?.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No active crises</div>
            ) : (
              crises?.data?.map((crisis: {
                id: string;
                title: string;
                severity: keyof typeof severityColors;
                status: keyof typeof statusLabels;
                location: string;
                country: string;
              }) => (
                <Link
                  key={crisis.id}
                  to={`/crises/${crisis.id}`}
                  className="block p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 truncate">{crisis.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {crisis.location || crisis.country || 'Unknown location'}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        'px-2.5 py-1 text-xs font-medium rounded-full border',
                        severityColors[crisis.severity]
                      )}
                    >
                      {crisis.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {statusLabels[crisis.status]}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Crisis by Type */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Crisis by Type</h2>
          </div>
          <div className="p-4">
            {statsLoading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats?.data?.byType || {}).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600">
                          {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        <span className="text-sm font-medium text-slate-900">{count as number}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full"
                          style={{ 
                            width: `${((count as number) / (stats?.data?.total || 1)) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
