import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity, BarChart3, Clock, Zap, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import BuyCryptoWidget from '../BuyCrypto/BuyCryptoWidget';
import CryptoChart from '../../../components/CryptoChart/CryptoChart';
import { apiFetch } from '../../../utils/api';
import './CoinDetail.css';

interface BinanceTicker {
  e: string;      // Event type
  E: number;      // Event time
  s: string;      // Symbol
  p: string;      // Price change
  P: string;      // Price change percent
  w: string;      // Weighted average price
  x: string;      // First trade(F)-1 price (fixed)
  c: string;      // Last price
  Q: string;      // Last quantity
  b: string;      // Best bid price
  B: string;      // Best bid quantity
  a: string;      // Best ask price
  A: string;      // Best ask quantity
  o: string;      // Open price
  h: string;      // High price
  l: string;      // Low price
  v: string;      // Total traded base asset volume
  q: string;      // Total traded quote asset volume
  O: number;      // Statistics open time
  C: number;      // Statistics close time
  F: number;      // First trade ID
  L: number;      // Last trade Id
  n: number;      // Total number of trades
}

const CoinDetail: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const symbol = searchParams.get('symbol');
  const id = symbol ? symbol.toLowerCase().replace(/usdt$/, '').replace(/usd$/, '') : '';
  const coinNameFromUrl = searchParams.get('name');
  const displayCoinName = coinNameFromUrl || (id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Coin');
  
  const navigate = useNavigate();
  const context = useOutletContext<{ user: any }>();
  const user = context?.user;
  const [ticker, setTicker] = useState<BinanceTicker | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [activePanel, setActivePanel] = useState<'stats' | 'buy' | 'sell'>('stats');
  
  const [viewMode, setViewMode] = useState<'live' | 'historical'>('live');

  const ws = useRef<WebSocket | null>(null);

  // 1. Fetch real-time exchange rate with React Query
  const { data: inrRate = 92.5, isLoading: isRateLoading } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async () => {
      const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/home/crypto/exchange-rate`);
      if (!res.ok) return 92.5;
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // 2. Fetch Historical Data with React Query
  const { data: histQueryResult, isLoading: isHistLoading } = useQuery({
    queryKey: ['historicalData', id],
    queryFn: async () => {
      if (!id) return null;
      const activeSymbol = symbol || id;
      const binanceSymbol = activeSymbol.toUpperCase().endsWith("USDT")
          ? activeSymbol.toUpperCase()
          : `${activeSymbol.toUpperCase()}USDT`;

      const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/home/crypto/historical-data?symbol=${binanceSymbol}&interval=15m&limit=96`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const historicalData = React.useMemo(() => {
    const data = histQueryResult?.tickerData;
    if (data && Array.isArray(data)) {
      return data.map((kline: any[]) => ({
        time: kline[0],
        price: parseFloat(kline[4]) * (inrRate || 1)
      }));
    }
    return [];
  }, [histQueryResult, inrRate]);

  const lastUpdated = histQueryResult?.timestamp || "";

  // 3. WebSocket Connection
  useEffect(() => {
    const activeSymbol = symbol || id;
    if (!activeSymbol || isRateLoading) return;

    const lowerSymbol = activeSymbol.toLowerCase();
    const binanceSymbol = lowerSymbol.endsWith('usdt') ? lowerSymbol : `${lowerSymbol}usdt`;
    const socketUrl = `${import.meta.env.VITE_WEBSOCKET_URL}/ws/crypto/${binanceSymbol}`;
    ws.current = new WebSocket(socketUrl);

    ws.current.onopen = () => setIsConnected(true);

    ws.current.onmessage = (event) => {
      const rawData: BinanceTicker = JSON.parse(event.data);
      
      const convertedData = {
        ...rawData,
        c: (parseFloat(rawData.c) * inrRate).toString(),
        h: (parseFloat(rawData.h) * inrRate).toString(),
        l: (parseFloat(rawData.l) * inrRate).toString(),
        o: (parseFloat(rawData.o) * inrRate).toString(),
        p: rawData.p,
      };

      setTicker(convertedData);
      
      setPriceHistory(prev => {
        const newHistory = [...prev, parseFloat(convertedData.c)];
        return newHistory.slice(-50);
      });
    };

    ws.current.onclose = () => setIsConnected(false);

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [symbol, id, inrRate, isRateLoading]);

  const isPositive = ticker ? parseFloat(ticker.P) >= 0 : true;

  // Prepare chart data based on view mode
  const chartData = React.useMemo(() => {
    if (viewMode === 'live') {
      const now = Date.now();
      return priceHistory.map((price, idx) => ({
        // synthesize a time for live updates (1 second apart for visualization)
        time: now - ((priceHistory.length - 1 - idx) * 1000), 
        value: price
      }));
    } else {
      return historicalData.map(d => ({
        time: d.time,
        value: d.price
      }));
    }
  }, [viewMode, priceHistory, historicalData]);

  if (!ticker && !isConnected && !historicalData.length) {
    return (
      <div className="detail-loader">
        <Activity className="animate-pulse" size={48} />
        <p>{isRateLoading ? 'Syncing Live Exchange Rates...' : 'Connecting to Markets...'}</p>
      </div>
    );
  }

  return (
    <div className="coin-detail-wrapper">
      <div className="detail-container">
        <nav className="detail-nav">
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            {isConnected ? 'LIVE MARKET' : 'BUFFERING'}
          </div>
        </nav>

        <header className="coin-header">
          <div className="coin-title-row">
            <div className="symbol-badge">{symbol?.toUpperCase()} / INR</div>
            <h1 className="coin-name-large">{displayCoinName} Price</h1>
          </div>
          
          <div className="price-section">
            <div className={`main-price ${isPositive ? 'up' : 'down'}`}>
              <span className="currency-symbol">₹</span>
              {ticker ? parseFloat(ticker.c).toLocaleString('en-IN') : '---'}
            </div>
            
            <div className="price-source-info">
              {ticker && (
                <>
                  <span className="usd-equivalent">
                    $ {parseFloat((parseFloat(ticker.c) / (inrRate || 92.5)).toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="rate-badge">Rate: ₹{inrRate}</span>
                </>
              )}
            </div>

            <div className={`price-badge ${isPositive ? 'bg-up' : 'bg-down'}`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {ticker?.P}%
            </div>
          </div>
        </header>

        <div className="detail-main-layout">
          <div className="main-left-column">
            <div className="chart-preview-card">
            <div className="card-header">
              <div className="title-group">
                <h3>{viewMode === 'live' ? 'Live Momentum' : 'Historical Trend'}</h3>
                <span className="live-indicator-text">{viewMode === 'live' ? 'Visualizing ticks' : 'Last 24 Hours'}</span>
              </div>
              
              <div className="chart-controls">
                <button 
                  className={`control-btn ${viewMode === 'live' ? 'active' : ''}`}
                  onClick={() => setViewMode('live')}
                >
                  <Zap size={14} /> Live
                </button>
                <button 
                  className={`control-btn ${viewMode === 'historical' ? 'active' : ''}`}
                  onClick={() => setViewMode('historical')}
                >
                  <History size={14} /> 24H
                </button>
              </div>

              {((viewMode === 'live' && priceHistory.length > 1) || (viewMode === 'historical' && historicalData.length > 0)) && (
                <div className="range-labels">
                  <span className="high">H: ₹{(() => {
                    const vals = (viewMode === 'live' ? priceHistory : historicalData.map(d => d.price)).filter(v => !isNaN(v) && v !== null);
                    if (!vals.length) return '---';
                    const max = Math.max(...vals);
                    return max >= 1000 ? (max / 1000).toFixed(2) + 'K' : max.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                  })()}</span>
                  <span className="low">L: ₹{(() => {
                    const vals = (viewMode === 'live' ? priceHistory : historicalData.map(d => d.price)).filter(v => !isNaN(v) && v !== null);
                    if (!vals.length) return '---';
                    const min = Math.min(...vals);
                    return min >= 1000 ? (min / 1000).toFixed(2) + 'K' : min.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                  })()}</span>
                </div>
              )}
            </div>
            
            <div className="chart-wrapper">
              {(viewMode === 'live' ? priceHistory.length > 1 : historicalData.length > 0) ? (
                <div style={{ width: '100%', height: '240px' }}>
                  <CryptoChart data={chartData} isPositive={isPositive} />
                </div>
              ) : (
                <div className="chart-placeholder">
                  {isHistLoading ? 'Fetching historical trends...' : 'Gathering market intelligence...'}
                </div>
              )}

              {viewMode === 'historical' && lastUpdated && (
                <div className="chart-timestamp">
                  Last updated: {lastUpdated} (IST)
                </div>
              )}
            </div>
          </div>

          <div className="action-buttons-container">
            <button className="btn-buy" onClick={() => {
              if (user) {
                setActivePanel('buy');
              } else {
                navigate('/login');
              }
            }}>
              Buy {displayCoinName}
            </button>
            <button className="btn-sell" onClick={() => {
              if (user) {
                setActivePanel('sell');
              } else {
                navigate('/login');
              }
            }}>
              Sell {displayCoinName}
            </button>
          </div>
          </div>

          {activePanel === 'stats' ? (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><Clock size={20} /></div>
                <div className="stat-info">
                  <span className="stat-label">24h High (₹)</span>
                  <span className="stat-value">{ticker ? parseFloat(ticker.h).toLocaleString('en-IN') : '---'}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><TrendingDown size={20} /></div>
                <div className="stat-info">
                  <span className="stat-label">24h Low (₹)</span>
                  <span className="stat-value">{ticker ? parseFloat(ticker.l).toLocaleString('en-IN') : '---'}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><BarChart3 size={20} /></div>
                <div className="stat-info">
                  <span className="stat-label">24h Volume ({symbol?.toUpperCase()})</span>
                  <span className="stat-value">{ticker ? parseFloat(ticker.v).toLocaleString(undefined, {maximumFractionDigits: 0}) : '---'}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Activity size={20} /></div>
                <div className="stat-info">
                  <span className="stat-label">Total Trades</span>
                  <span className="stat-value">{ticker?.n.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="buy-widget-wrapper">
              <BuyCryptoWidget 
                id={id} 
                name={displayCoinName}
                symbol={symbol || id + 'usdt'} 
                user={user} 
                ticker={ticker} 
                inrRate={inrRate} 
                tradeType={activePanel === 'buy' ? 'BUY' : 'SELL'}
                onCancel={() => setActivePanel('stats')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoinDetail;
