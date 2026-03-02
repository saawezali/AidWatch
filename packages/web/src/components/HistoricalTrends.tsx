import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3 } from 'lucide-react';
import { api } from '../lib/api';

interface TrendData {
  date: string;
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

interface TrendsResponse {
  success: boolean;
  data: {
    days: number;
    startDate: string;
    trends: TrendData[];
    summary: {
      totalCrises: number;
      avgPerDay: string;
    };
  };
}

interface HistoricalTrendsProps {
  days?: number;
}

export default function HistoricalTrends({ days = 30 }: HistoricalTrendsProps) {
  const { data, isLoading, error } = useQuery<TrendsResponse>({
    queryKey: ['crisis-trends', days],
    queryFn: async () => {
      const response = await api.get('/crises/stats/trends', { params: { days } });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const chartData = useMemo(() => {
    if (!data?.data?.trends) return [];
    return data.data.trends;
  }, [data]);

  const maxCount = useMemo(() => {
    return Math.max(...chartData.map(d => d.total), 1);
  }, [chartData]);

  const trendDirection = useMemo(() => {
    if (chartData.length < 7) return 'neutral';
    const recent = chartData.slice(-7).reduce((acc, d) => acc + d.total, 0);
    const previous = chartData.slice(-14, -7).reduce((acc, d) => acc + d.total, 0);
    
    if (recent > previous * 1.1) return 'up';
    if (recent < previous * 0.9) return 'down';
    return 'neutral';
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-4" />
          <div className="h-40 bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-red-500 dark:text-red-400">Failed to load trends data</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Crisis Trends
          </h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {trendDirection === 'up' && (
            <span className="flex items-center gap-1 text-red-500">
              <TrendingUp className="w-4 h-4" />
              Increasing
            </span>
          )}
          {trendDirection === 'down' && (
            <span className="flex items-center gap-1 text-green-500">
              <TrendingDown className="w-4 h-4" />
              Decreasing
            </span>
          )}
          {trendDirection === 'neutral' && (
            <span className="flex items-center gap-1 text-slate-500">
              <Minus className="w-4 h-4" />
              Stable
            </span>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total ({days} days)
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {data?.data.summary.totalCrises ?? 0}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Avg/Day
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {data?.data.summary.avgPerDay ?? '0'}
          </p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="relative">
        <div className="flex items-end justify-between gap-px h-32">
          {chartData.map((day, index) => {
            const height = (day.total / maxCount) * 100;
            const isToday = index === chartData.length - 1;
            
            return (
              <div
                key={day.date}
                className="flex-1 relative group"
                title={`${day.date}: ${day.total} crises`}
              >
                <div
                  className={`w-full transition-all rounded-t ${
                    isToday 
                      ? 'bg-blue-500 dark:bg-blue-400' 
                      : 'bg-blue-200 dark:bg-blue-600 hover:bg-blue-300 dark:hover:bg-blue-500'
                  }`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <div className="bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-800 text-xs rounded px-2 py-1 whitespace-nowrap">
                    <div className="font-medium">{day.date}</div>
                    <div>{day.total} crises</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {chartData[0]?.date}
          </span>
          <span>{chartData[chartData.length - 1]?.date}</span>
        </div>
      </div>

      {/* Severity breakdown legend */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Recent by Severity</p>
        <div className="flex gap-4 text-sm">
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(severity => {
            const count = chartData.slice(-7).reduce(
              (acc, d) => acc + (d.bySeverity[severity] || 0), 
              0
            );
            const colors: Record<string, string> = {
              CRITICAL: 'bg-red-500',
              HIGH: 'bg-orange-500',
              MEDIUM: 'bg-yellow-500',
              LOW: 'bg-green-500',
            };
            
            return (
              <div key={severity} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${colors[severity]}`} />
                <span className="text-slate-600 dark:text-slate-300">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
