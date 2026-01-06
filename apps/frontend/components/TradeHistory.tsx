
'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
}

export default function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_TRADING_API}/api/trades?limit=10`
      );
      
      if (response.ok) {
        const data = await response.json();
        setTrades(data.trades || []);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
      // Demo data
      setTrades([
        {
          id: '1',
          symbol: 'BTC',
          side: 'buy',
          quantity: 0.5,
          price: 45000,
          total: 22500,
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          symbol: 'ETH',
          side: 'sell',
          quantity: 2,
          price: 3000,
          total: 6000,
          timestamp: new Date(Date.now() - 300000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                Time
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                Symbol
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">
                Side
              </th>
              <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">
                Quantity
              </th>
              <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">
                Price
              </th>
              <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-300">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-white">
                    {trade.symbol}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-medium ${
                      trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {trade.side === 'buy' ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownRight size={16} />
                    )}
                    {trade.side.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-white">
                  {trade.quantity}
                </td>
                <td className="px-6 py-4 text-right text-sm text-white">
                  ${trade.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium text-white">
                  ${trade.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trades.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">No trades yet</p>
        </div>
      )}
    </div>
  );
}