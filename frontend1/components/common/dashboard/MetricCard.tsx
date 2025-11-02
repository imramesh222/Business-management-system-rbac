import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number; // percentage change (can be positive or negative)
  changeLabel?: string; // Custom label for the change
  description?: string; // Optional description text
  className?: string;
}
export function MetricCard({ 
  title, 
  value, 
  icon, 
  change, 
  changeLabel,
  description, 
  className 
}: MetricCardProps) {
  const isPositive = change !== undefined ? change > 0 : null;
  const isNeutral = change === 0;
  
  return (
    <div className={cn("p-6 bg-white rounded-lg shadow-sm border border-gray-100", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
          {change !== undefined && (
            <div className={cn(
              "mt-2 flex items-center text-sm",
              isNeutral ? 'text-gray-500' : isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {!isNeutral && (
                isPositive ? (
                  <ArrowUp className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 mr-1" />
                )
              )}
              {changeLabel || (
                isNeutral ? (
                  <span className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    No change
                  </span>
                ) : (
                  `${Math.abs(change)}% ${isPositive ? 'increase' : 'decrease'}`
                )
              )}
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}