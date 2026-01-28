import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Clock, ExternalLink, Activity, AlertTriangle } from 'lucide-react';
import { crisisApi } from '../lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';

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
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to crises
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{crisis.title}</h1>
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
          <div className="text-right">
            <div className="text-sm text-slate-500">AI Confidence</div>
            <div className="text-2xl font-bold text-slate-900">
              {Math.round(crisis.confidence * 100)}%
            </div>
          </div>
        </div>

        <p className="text-slate-600 mb-4">{crisis.description}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
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
                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Recent Events</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {crisis.events?.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No events tracked yet</div>
            ) : (
              crisis.events?.map((event: {
                id: string;
                title: string;
                source: string;
                sourceType: string;
                publishedAt: string;
              }) => (
                <div key={event.id} className="p-4">
                  <h3 className="font-medium text-slate-900 mb-1">{event.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                      {event.sourceType}
                    </span>
                    <span>{format(new Date(event.publishedAt), 'MMM d, yyyy')}</span>
                    <a
                      href={event.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary-600 hover:underline"
                    >
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Summaries */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">AI Summaries</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {crisis.summaries?.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
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
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                      {summary.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {format(new Date(summary.createdAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {summary.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
