import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatCardProps = {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
};

export function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className={cn(
            "text-xs mt-1",
            trend.isPositive ? "text-green-500" : "text-red-500"
          )}>
            {trend.value} {trend.isPositive ? '↑' : '↓'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type StatCardSkeletonProps = {
  className?: string;
};

export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-0 pb-2">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-3 w-32 bg-gray-100 rounded animate-pulse"></div>
      </CardContent>
    </Card>
  );
}
