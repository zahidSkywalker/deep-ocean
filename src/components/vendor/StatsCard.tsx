'use client';

import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  change?: number;
  iconBgColor?: string;
  iconColor?: string;
}

export function StatsCard({
  icon: Icon,
  value,
  label,
  change,
  iconBgColor = 'bg-fw-300/15',
  iconColor = 'text-fw-300',
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 md:p-6 hover-lift">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl md:text-3xl font-bold font-heading text-ag-100">{value}</p>
        <p className="text-sm text-ag-300 mt-1 font-body">{label}</p>
      </div>
    </div>
  );
}