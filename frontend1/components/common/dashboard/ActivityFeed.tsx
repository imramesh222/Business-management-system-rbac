import { Activity, AlertCircle, CheckCircle, Clock, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityType = 'info' | 'success' | 'warning' | 'error' | 'update';

interface ActivityItem {
  id: string | number;
  title: string;
  description: string;
  timestamp: string;
  type: ActivityType;
}

const activityIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  update: Activity,
};

const activityColors = {
  info: 'text-blue-500 bg-blue-50',
  success: 'text-green-500 bg-green-50',
  warning: 'text-yellow-500 bg-yellow-50',
  error: 'text-red-500 bg-red-50',
  update: 'text-purple-500 bg-purple-50',
};

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
}

export function ActivityFeed({
  activities,
  className,
  title = 'Recent Activity',
  emptyMessage = 'No recent activity',
  maxItems = 5,
}: ActivityFeedProps) {
  // Ensure all activities have a unique ID
  const displayedActivities = (maxItems ? activities.slice(0, maxItems) : activities).map((activity, index) => ({
    ...activity,
    id: activity.id || `activity-${index}-${Date.now()}` // Fallback to a unique ID if not provided
  }));

  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      )}
      
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {displayedActivities.length > 0 ? (
            displayedActivities.map((activity, activityIdx) => {
              const Icon = activityIcons[activity.type] || Activity;
              
              return (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== activities.length - 1 ? (
                      <span
                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white',
                            activityColors[activity.type]
                          )}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-800">
                            {activity.title}
                            {activity.description && (
                              <span className="font-medium text-gray-900">
                                {' '}{activity.description}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <time dateTime={activity.timestamp}>
                            {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">{emptyMessage}</p>
            </div>
          )}
        </ul>
      </div>
    </div>
  );
}
