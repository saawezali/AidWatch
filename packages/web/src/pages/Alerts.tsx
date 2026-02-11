import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, AlertTriangle, TrendingUp, FileText } from 'lucide-react';
import { alertsApi } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const alertTypeIcons = {
  NEW_CRISIS: AlertTriangle,
  SEVERITY_CHANGE: TrendingUp,
  STATUS_CHANGE: Bell,
  SUMMARY_READY: FileText,
  THRESHOLD_BREACH: AlertTriangle,
};

const severityColors = {
  CRITICAL: 'border-l-red-500',
  HIGH: 'border-l-orange-500',
  MEDIUM: 'border-l-yellow-500',
  LOW: 'border-l-green-500',
  UNKNOWN: 'border-l-slate-500',
};

interface Alert {
  id: string;
  type: keyof typeof alertTypeIcons;
  title: string;
  message: string;
  severity: keyof typeof severityColors;
  isRead: boolean;
  createdAt: string;
  crisis: {
    id: string;
    title: string;
  } | null;
}

export default function Alerts() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.list({ limit: 50 }),
  });

  const markReadMutation = useMutation({
    mutationFn: alertsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: alertsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const alerts: Alert[] = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="space-y-6 mt-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Alerts</h1>
          <p className="text-sm text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No alerts yet</p>
            <p className="text-sm text-slate-400 mt-1">
              You'll be notified when new crises are detected
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => {
              const Icon = alertTypeIcons[alert.type] || Bell;
              
              return (
                <div
                  key={alert.id}
                  className={clsx(
                    'p-4 border-l-4 transition-colors',
                    severityColors[alert.severity],
                    alert.isRead ? 'bg-white' : 'bg-blue-50/50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={clsx(
                        'p-2 rounded-lg',
                        alert.isRead ? 'bg-slate-100' : 'bg-primary-100'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'h-5 w-5',
                          alert.isRead ? 'text-slate-500' : 'text-primary-600'
                        )}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={clsx(
                            'font-medium',
                            alert.isRead ? 'text-slate-700' : 'text-slate-900'
                          )}
                        >
                          {alert.title}
                        </h3>
                        {!alert.isRead && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{alert.message}</p>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-500">
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </span>
                        {alert.crisis && (
                          <Link
                            to={`/crises/${alert.crisis.id}`}
                            className="text-primary-600 hover:underline"
                          >
                            View crisis →
                          </Link>
                        )}
                      </div>
                    </div>

                    {!alert.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(alert.id)}
                        disabled={markReadMutation.isPending}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
