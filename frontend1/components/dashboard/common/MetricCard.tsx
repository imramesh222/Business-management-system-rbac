import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type TrendType = 'up' | 'down' | 'neutral' | 'none';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string | number;
    type: TrendType;
  };
  icon?: React.ReactNode;
  className?: string;
  // New props for simplified trend display
  change?: number;
  changeLabel?: string;
}

export function MetricCard({ 
  title, 
  value, 
  description, 
  trend, 
  icon,
  className,
  change,
  changeLabel
}: MetricCardProps) {
  // If change prop is provided, use it to determine trend
  const derivedTrend = change !== undefined ? {
    value: `${Math.abs(change)}%`,
    type: (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') as TrendType
  } : trend;
  const getTrendIcon = (type: TrendType) => {
    switch (type) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTrendTextClass = (type: TrendType) => {
    switch (type) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      case 'neutral':
        return 'text-yellow-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {derivedTrend && (
          <div className={cn("flex items-center text-sm", getTrendTextClass(derivedTrend.type))}>
            {getTrendIcon(derivedTrend.type)}
            <span className="ml-1">
              {changeLabel || derivedTrend.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
