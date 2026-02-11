import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  TrendingUp, 
  Globe, 
  Activity,
  ArrowRight,
  AlertCircle,
  Zap,
  Shield,
  Radio,
  Clock
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

const statusColors = {
  EMERGING: 'text-blue-600 bg-blue-100',
  DEVELOPING: 'text-yellow-600 bg-yellow-100',
  ONGOING: 'text-red-600 bg-red-100',
  STABILIZING: 'text-green-600 bg-green-100',
  RESOLVED: 'text-slate-600 bg-slate-100',
};

// Animated number component
function AnimatedNumber({ value, isLoading }: { value: number; isLoading: boolean }) {
  if (isLoading) {
    return <span className="inline-block w-12 h-8 skeleton rounded" />;
  }
  return (
    <span className="animate-count-up inline-block tabular-nums">
      {value}
    </span>
  );
}

// Loading skeleton for cards
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="w-24 h-4 skeleton rounded" />
          <div className="w-16 h-8 skeleton rounded" />
        </div>
        <div className="w-12 h-12 skeleton rounded-xl" />
      </div>
    </div>
  );
}

// Loading skeleton for list items
function ListItemSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="w-3/4 h-5 skeleton rounded" />
          <div className="w-1/2 h-4 skeleton rounded" />
        </div>
        <div className="w-20 h-6 skeleton rounded-full" />
      </div>
      <div className="flex gap-2">
        <div className="w-20 h-4 skeleton rounded" />
      </div>
    </div>
  );
}

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
      gradient: 'from-red-500 to-rose-600',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      trend: stats?.data?.recentCount ? `+${stats?.data?.recentCount} this week` : null,
    },
    {
      title: 'Critical Alerts',
      value: stats?.data?.bySeverity?.CRITICAL || 0,
      icon: Zap,
      gradient: 'from-orange-500 to-amber-600',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-500',
      pulse: (stats?.data?.bySeverity?.CRITICAL || 0) > 0,
    },
    {
      title: 'Regions Monitored',
      value: Object.keys(stats?.data?.byType || {}).length || 8,
      icon: Globe,
      gradient: 'from-blue-500 to-cyan-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'AI Confidence',
      value: 94,
      suffix: '%',
      icon: Shield,
      gradient: 'from-emerald-500 to-green-600',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Combined Status Bar */}
      <div className="mt-12 bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent border border-primary-200/50 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        {/* Left: System Status */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="h-4 w-4 text-green-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <span className="text-green-600 font-medium text-sm">System Active</span>
          <span className="text-slate-300 mx-1">|</span>
          <Globe className="h-4 w-4 text-primary-500" />
          <span className="text-slate-700 text-sm">
            Monitoring <span className="font-semibold text-primary-600">{stats?.data?.total || 0}</span> active situations
          </span>
        </div>

        {/* Right: Last Updated */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="h-4 w-4" />
          <span>Updated {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          statCards.map((stat, index) => (
            <div 
              key={stat.title} 
              className={clsx(
                'stat-card bg-white rounded-2xl p-6 border border-slate-200 card-hover cursor-default',
                `animate-fade-in-up stagger-${index + 1}`
              )}
              style={{ opacity: 0 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-slate-900 number-counter">
                      <AnimatedNumber value={stat.value} isLoading={statsLoading} />
                    </span>
                    {stat.suffix && (
                      <span className="text-xl font-semibold text-slate-500">{stat.suffix}</span>
                    )}
                  </div>
                  {stat.trend && (
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend}
                    </p>
                  )}
                </div>
                <div className={clsx(
                  'p-3 rounded-xl relative',
                  stat.iconBg
                )}>
                  {stat.pulse && (
                    <span className="absolute inset-0 rounded-xl bg-orange-500/20 animate-ping" />
                  )}
                  <stat.icon className={clsx('h-6 w-6 relative z-10', stat.iconColor)} />
                </div>
              </div>
              {/* Decorative gradient bar */}
              <div className={clsx(
                'absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r rounded-b-2xl',
                stat.gradient
              )} />
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Crises */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-fade-in-up stagger-3" style={{ opacity: 0 }}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Priority Crises</h2>
            </div>
            <Link 
              to="/crises" 
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 group"
            >
              View all 
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {crisesLoading ? (
              <>
                <ListItemSkeleton />
                <ListItemSkeleton />
                <ListItemSkeleton />
              </>
            ) : crises?.data?.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">No active crises</p>
                <p className="text-sm text-slate-400 mt-1">All systems are stable</p>
              </div>
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
                  className="list-item-interactive block p-4 hover:bg-gradient-to-r hover:from-slate-50 hover:to-white transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {crisis.severity === 'CRITICAL' && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                          </span>
                        )}
                        <h3 className="font-medium text-slate-900 truncate group-hover:text-primary-600 transition-colors">
                          {crisis.title}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {crisis.location || crisis.country || 'Unknown location'}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        'px-2.5 py-1 text-xs font-semibold rounded-full border shrink-0',
                        severityColors[crisis.severity],
                        crisis.severity === 'CRITICAL' && 'animate-pulse-slow'
                      )}
                    >
                      {crisis.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={clsx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      statusColors[crisis.status]
                    )}>
                      <Activity className="h-3 w-3" />
                      {statusLabels[crisis.status]}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Crisis by Type */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-fade-in-up stagger-4" style={{ opacity: 0 }}>
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary-100 rounded-lg">
                <Activity className="h-4 w-4 text-primary-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Crisis Distribution</h2>
            </div>
          </div>
          <div className="p-5">
            {statsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="w-24 h-4 skeleton rounded" />
                      <div className="w-8 h-4 skeleton rounded" />
                    </div>
                    <div className="w-full h-2 skeleton rounded-full" />
                  </div>
                ))}
              </div>
            ) : Object.keys(stats?.data?.byType || {}).length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(stats?.data?.byType || {}).map(([type, count], index) => {
                  const percentage = ((count as number) / (stats?.data?.total || 1)) * 100;
                  const colors = [
                    'from-red-500 to-rose-500',
                    'from-orange-500 to-amber-500',
                    'from-yellow-500 to-lime-500',
                    'from-emerald-500 to-green-500',
                    'from-cyan-500 to-blue-500',
                    'from-violet-500 to-purple-500',
                  ];
                  
                  return (
                    <div key={type} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                          {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {count as number}
                        </span>
                      </div>
                      <div className="progress-bar group-hover:scale-[1.02] transition-transform">
                        <div 
                          className={clsx(
                            'progress-bar-fill bg-gradient-to-r',
                            colors[index % colors.length]
                          )}
                          style={{ 
                            width: `${percentage}%`,
                            transitionDelay: `${index * 100}ms`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Quick stats at bottom */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {stats?.data?.byStatus?.ONGOING || 0}
              </p>
              <p className="text-xs text-slate-500">Ongoing</p>
            </div>
            <div className="text-center border-x border-slate-200">
              <p className="text-2xl font-bold text-slate-900">
                {stats?.data?.byStatus?.EMERGING || 0}
              </p>
              <p className="text-xs text-slate-500">Emerging</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">
                {stats?.data?.byStatus?.STABILIZING || 0}
              </p>
              <p className="text-xs text-slate-500">Stabilizing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
