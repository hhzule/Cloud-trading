
'use client';

import { useEffect, useState } from 'react';
import MarketDataCard from './../components/MarketDataCard';
import TradeHistory from './../components/TradeHistory';
import PortfolioSummary from './../components/PortfolioSummary';

interface MarketData {
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
  timestamp: string;
}

export default function Dashboard() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   fetchMarkets();
  //   const interval = setInterval(fetchMarkets, 5000); // Refresh every 5 seconds
  //   return () => clearInterval(interval);
  // }, []);

  // const fetchMarkets = async () => {
  //   try {
  //     const response = await fetch(
  //       `${process.env.NEXT_PUBLIC_MARKET_DATA_API}/api/markets`
  //     );
  //     if (!response.ok) throw new Error('Failed to fetch market data');
  //     const data = await response.json();
  //     setMarkets(data);
  //     setError(null);
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Unknown error');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            CloudTrade Platform
          </h1>
          <p className="text-slate-400">
            Real-time cryptocurrency trading dashboard
          </p>
        </header>

        {/* Portfolio Summary */}
        <div className="mb-8">
          <PortfolioSummary />
        </div>

        {/* Market Data Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Live Markets
          </h2>
          
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-slate-400 mt-4">Loading market data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-4">
              <p className="text-red-400">Error: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* {markets && markets.map((market) => (
                <MarketDataCard key={market.symbol} data={market} />
              ))} */}
            </div>
          )}
        </div>

        {/* Trade History */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Recent Trades
          </h2>
          <TradeHistory />
        </div>
      </div>
    </main>
  );
}
