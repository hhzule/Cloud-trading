
'use client';

import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface PortfolioStats {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  positions: number;
}

export default function PortfolioSummary() {
  const [stats, setStats] = useState<PortfolioStats>({
    totalValue: 0,
    totalChange: 0,
    totalChangePercent: 0,
    positions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolio = async () => {
    try {
      const userId = 'user-123'; // In production, get from auth
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_TRADING_API}/api/portfolio/${userId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalValue: data.balance || 50000,
          totalChange: 2500,
          totalChangePercent: 5.26,
          positions: data.positions?.length || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
      // Use demo data on error
      setStats({
        totalValue: 50000,
        totalChange: 2500,
        totalChangePercent: 5.26,
        positions: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Value',
      value: `$${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      color: 'blue',
    },
    {
      title: '24h Change',
      value: `${stats.totalChange >= 0 ? '+' : ''}$${Math.abs(stats.totalChange).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      subtitle: `${stats.totalChangePercent >= 0 ? '+' : ''}${stats.totalChangePercent.toFixed(2)}%`,
      icon: TrendingUp,
      color: stats.totalChange >= 0 ? 'green' : 'red',
    },
    {
      title: 'Active Positions',
      value: stats.positions.toString(),
      icon: Activity,
      color: 'purple',
    },
    {
      title: 'Available Cash',
      value: '$15,234.56',
      icon: DollarSign,
      color: 'yellow',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30',
    green: 'bg-green-500/10 border-green-500/30',
    red: 'bg-red-500/10 border-red-500/30',
    purple: 'bg-purple-500/10 border-purple-500/30',
    yellow: 'bg-yellow-500/10 border-yellow-500/30',
  };

  const iconColorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`rounded-lg border ${colorClasses[card.color as keyof typeof colorClasses]} p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">
                {card.title}
              </h3>
              <Icon className={`w-5 h-5 ${iconColorClasses[card.color as keyof typeof iconColorClasses]}`} />
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            {card.subtitle && (
              <div className={`text-sm mt-1 ${iconColorClasses[card.color as keyof typeof iconColorClasses]}`}>
                {card.subtitle}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

