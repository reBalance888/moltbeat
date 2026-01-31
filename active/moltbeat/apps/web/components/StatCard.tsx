'use client';

import { formatNumber } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  loading?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'red' | 'yellow';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  onClick?: () => void;
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-yellow-100 text-yellow-600',
};

export function StatCard({
  title,
  value,
  icon,
  loading = false,
  color = 'blue',
  trend,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={`card p-6 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 mb-2">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-slate-200 animate-shimmer rounded"></div>
          ) : (
            <div>
              <p className="text-3xl font-bold text-slate-900">
                {typeof value === 'number' ? formatNumber(value) : value}
              </p>
              {trend && (
                <p
                  className={`text-xs mt-1 ${
                    trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
                </p>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
