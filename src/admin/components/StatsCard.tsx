
import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  actionLabel?: string;
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo';
}

export const StatsCard = ({ label, value, icon: Icon, trend, trendLabel, actionLabel, color = 'blue' }: StatsCardProps) => {
  const colorClasses = {
    emerald: "bg-accent/15 text-accent border-accent/30",
    blue: "bg-primary/10 text-primary border-primary/25",
    amber: "bg-warning/15 text-warning border-warning/30",
    rose: "bg-destructive/10 text-destructive border-destructive/25",
    indigo: "bg-primary/10 text-primary border-primary/25",
  };

  return (
    <div className="bg-card p-4 sm:p-5 rounded-lg border border-border card-shadow hover:card-shadow-hover transition-shadow duration-200 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2.5 rounded-lg border", colorClasses[color])}>
          <Icon size={22} />
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold",
            trend >= 0 ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"
          )}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <h3 className="admin-kicker mb-1">{label}</h3>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      
      {trendLabel && (
        <p className="text-xs text-muted-foreground/80 mt-2 font-medium">{trendLabel}</p>
      )}

      {actionLabel && (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
          {actionLabel}
          <ArrowRight size={14} />
        </span>
      )}
    </div>
  );
};
