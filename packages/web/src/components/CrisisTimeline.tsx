import { useQuery } from '@tanstack/react-query';
import { Clock, ExternalLink, Newspaper, Radio, MessageSquare } from 'lucide-react';
import { api } from '../lib/api';

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  publishedAt: string;
  url: string | null;
  source: {
    name: string;
    type: string;
  } | null;
}

interface TimelineDay {
  date: string;
  eventCount: number;
  events: TimelineEvent[];
}

interface TimelineResponse {
  success: boolean;
  data: {
    crisis: {
      id: string;
      title: string;
      startDate: string;
    };
    timeline: TimelineDay[];
    totalEvents: number;
  };
}

interface CrisisTimelineProps {
  crisisId: string;
  maxDays?: number;
}

function getSourceIcon(type: string | undefined) {
  switch (type) {
    case 'NEWS':
      return <Newspaper className="w-4 h-4" />;
    case 'SOCIAL_MEDIA':
      return <MessageSquare className="w-4 h-4" />;
    case 'RADIO':
      return <Radio className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CrisisTimeline({ crisisId, maxDays = 14 }: CrisisTimelineProps) {
  const { data, isLoading, error } = useQuery<TimelineResponse>({
    queryKey: ['crisis-timeline', crisisId],
    queryFn: async () => {
      const response = await api.get(`/crises/${crisisId}/timeline`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-2" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-red-500 dark:text-red-400">Failed to load timeline</p>
      </div>
    );
  }

  const { timeline, totalEvents } = data.data;
  const displayTimeline = timeline.slice(-maxDays);

  if (displayTimeline.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Timeline
        </h3>
        <p className="text-slate-500 dark:text-slate-400">No events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Timeline
        </h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {totalEvents} events
        </span>
      </div>

      <div className="space-y-6">
        {displayTimeline.map((day, dayIndex) => (
          <div key={day.date} className="relative">
            {/* Date header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 py-2 z-10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatDate(day.date)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({day.eventCount} event{day.eventCount !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Events for this day */}
            <div className="ml-1.5 pl-6 border-l-2 border-slate-200 dark:border-slate-700 space-y-3">
              {day.events.slice(0, 5).map((event) => (
                <div 
                  key={event.id}
                  className="relative bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {/* Time marker */}
                  <div className="absolute -left-[29px] top-3 w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-600 flex items-center justify-center">
                    {getSourceIcon(event.source?.type)}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatTime(event.publishedAt)}
                        </span>
                        {event.source && (
                          <span className="text-xs px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300">
                            {event.source.name}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors shrink-0"
                        aria-label="Open source"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
              
              {day.events.length > 5 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-2">
                  +{day.events.length - 5} more events
                </p>
              )}
            </div>

            {/* Connector to next day */}
            {dayIndex < displayTimeline.length - 1 && (
              <div className="absolute left-1.5 top-8 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
