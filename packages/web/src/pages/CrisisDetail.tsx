import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, Activity, AlertTriangle } from 'lucide-react';
import { crisisApi } from '../lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import CrisisTimeline from '../components/CrisisTimeline';
import ConfidenceScore from '../components/ConfidenceScore';

const severityColors = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200',
  UNKNOWN: 'bg-slate-100 text-slate-800 border-slate-200',
};

const statusColors = {
  EMERGING: 'bg-blue-100 text-blue-800',
  DEVELOPING: 'bg-yellow-100 text-yellow-800',
  ONGOING: 'bg-red-100 text-red-800',
  STABILIZING: 'bg-green-100 text-green-800',
  RESOLVED: 'bg-slate-100 text-slate-800',
};

export default function CrisisDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['crisis', id],
    queryFn: () => crisisApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading crisis details...</div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700">Failed to load crisis details</p>
        <Link to="/crises" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to list
        </Link>
      </div>
    );
  }

  const crisis = data.data;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/crises"
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to crises
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{crisis.title}</h1>
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  'px-3 py-1 text-sm font-medium rounded-full border',
                  severityColors[crisis.severity as keyof typeof severityColors]
                )}
              >
                {crisis.severity} Severity
              </span>
              <span
                className={clsx(
                  'px-3 py-1 text-sm font-medium rounded-full',
                  statusColors[crisis.status as keyof typeof statusColors]
                )}
              >
                {crisis.status}
              </span>
            </div>
          </div>
          <div className="text-right min-w-[120px]">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">AI Confidence</div>
            <ConfidenceScore score={crisis.confidence} size="md" />
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-300 mb-4">{crisis.description}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {[crisis.location, crisis.region, crisis.country].filter(Boolean).join(', ') || 'Unknown location'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Detected {formatDistanceToNow(new Date(crisis.detectedAt), { addSuffix: true })}
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            {crisis._count.events} events tracked
          </span>
        </div>

        {crisis.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {crisis.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crisis Timeline */}
        <CrisisTimeline crisisId={id!} maxDays={14} />

        {/* AI Summaries */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">AI Summaries</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
            {crisis.summaries?.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                No AI summaries generated yet
              </div>
            ) : (
              crisis.summaries?.map((summary: {
                id: string;
                type: string;
                content: string;
                createdAt: string;
              }) => (
                <div key={summary.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium rounded">
                      {summary.type}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(summary.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 prose prose-sm prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{summary.content}</ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
