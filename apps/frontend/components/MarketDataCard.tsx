
'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketData {
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
  timestamp: string;
}

interface Props {
  data: MarketData;
}

export default function MarketDataCard({ data: initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const wsUrl = process.env.NEXT_PUBLIC_MARKET_DATA_WS || 'ws://localhost:8000';
    const ws = new WebSocket(`${wsUrl}/ws/${data.symbol}`);

    ws.onopen = () => {
      setIsConnected(true);
      console.log(`Connected to ${data.symbol} stream`);
    };

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setData(update);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log(`Disconnected from ${data.symbol} stream`);
    };

    return () => {
      ws.close();
    };
  }, [data.symbol]);

  const isPositive = data.change_24h >= 0;
  const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
  const bgColor = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';

  return (
    <div className={`rounded-lg border border-slate-700 ${bgColor} p-6 hover:border-slate-600 transition-all`}>
      {/* Symbol and Status */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">{data.symbol}</h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-500'}`} 
             title={isConnected ? 'Live' : 'Disconnected'} />
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-white">
          ${data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`flex items-center gap-1 text-sm ${changeColor} mt-1`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{isPositive ? '+' : ''}{data.change_24h.toFixed(2)}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">24h High</span>
          <span className="text-white font-medium">
            ${data.high_24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">24h Low</span>
          <span className="text-white font-medium">
            ${data.low_24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Volume</span>
          <span className="text-white font-medium">
            ${(data.volume_24h / 1000000).toFixed(2)}M
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition-colors">
          Buy
        </button>
        <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors">
          Sell
        </button>
      </div>
    </div>
  );
}
