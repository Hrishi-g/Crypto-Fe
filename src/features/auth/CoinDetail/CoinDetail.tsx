import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity, BarChart3, Clock, Zap, History } from 'lucide-react';
import BuyCryptoWidget from '../BuyCrypto/BuyCryptoWidget';
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
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const symbol = searchParams.get('symbol');
  
  const navigate = useNavigate();
  const context = useOutletContext<{ user: any }>();
  const user = context?.user;
  const [ticker, setTicker] = useState<BinanceTicker | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [inrRate, setInrRate] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [activePanel, setActivePanel] = useState<'stats' | 'buy' | 'sell'>('stats');
  
  // Historical Chart States
  const [viewMode, setViewMode] = useState<'live' | 'historical'>('live');
  const [historicalData, setHistoricalData] = useState<{time: number, price: number}[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isHistLoading, setIsHistLoading] = useState(false);
  const [hoveredData, setHoveredData] = useState<{ x: number, y: number, price: number, time: number } | null>(null);

  const ws = useRef<WebSocket | null>(null);

  // 1. Fetch real-time exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('http://localhost:8080/home/crypto/exchange-rate');
        if (res.ok) {
          const rate = await res.json();
          setInrRate(rate);
        }
      } catch (err) {
        console.error("Failed to fetch exchange rate:", err);
        setInrRate(92.50); 
      }
    };
    fetchRate();
  }, []);

  // 2. Fetch Historical Data
  useEffect(() => {
    if (!id) return;
    const fetchHistorical = async () => {
      // Map base symbols to CoinGecko IDs since Binance doesn't provide them
      const symbolMap: Record<string, string> = {
        btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', sol: 'solana',
        xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', trx: 'tron',
        dot: 'polkadot', avax: 'avalanche-2', link: 'chainlink', matic: 'matic-network',
        shib: 'shiba-inu', ltc: 'litecoin', bch: 'bitcoin-cash', xlm: 'stellar'
      };
      const coinGeckoId = symbolMap[id] || id;

      setIsHistLoading(true);
      try {
        const res = await fetch(`http://localhost:8080/home/crypto/historical-data?coinId=${coinGeckoId}&days=1`);
        if (res.ok) {
          const result = await res.json();
          // Backend returns { tickerData: { prices: [] }, timestamp: "..." }
          const data = result?.tickerData;
          if (data && data.prices) {
            const mapped = data.prices.map((p: any) => ({ 
              time: p[0], 
              price: p[1] 
            }));
            setHistoricalData(mapped);
          }
          if (result?.timestamp) {
            setLastUpdated(result.timestamp);
          }
        }
      } catch (err) {
        console.error("Failed to fetch historical data:", err);
      } finally {
        setIsHistLoading(false);
      }
    };
    fetchHistorical();
  }, [id]);

  // 3. WebSocket Connection
  useEffect(() => {
    if (!symbol || inrRate === null) return;

    // Our new homepage passes "BTCUSDT" directly, prevent "btcusdtusdt"
    const lowerSymbol = symbol.toLowerCase();
    const binanceSymbol = lowerSymbol.endsWith('usdt') ? lowerSymbol : `${lowerSymbol}usdt`;
    const socketUrl = `ws://localhost:8080/ws/crypto/${binanceSymbol}`;
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
        p: (parseFloat(rawData.p) * inrRate).toString()
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
  }, [symbol, inrRate]);

  if (!ticker && !isConnected && !historicalData.length) {
    return (
      <div className="detail-loader">
        <Activity className="animate-pulse" size={48} />
        <p>{inrRate === null ? 'Syncing Live Exchange Rates...' : 'Connecting to Markets...'}</p>
      </div>
    );
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (viewMode === 'live' || historicalData.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 450;
    const boundedX = Math.min(Math.max(mouseX, 0), 415);
    
    const idx = Math.round((boundedX / 415) * (historicalData.length - 1));
    const point = historicalData[idx];

    if (point) {
      const prices = historicalData.map(d => d.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min || 1;
      const x = (idx / (historicalData.length - 1)) * 415;
      const y = 200 - ((point.price - min) / range) * 180;
      setHoveredData({ x, y, price: point.price, time: point.time });
    }
  };

  const handleMouseLeave = () => setHoveredData(null);

  const isPositive = ticker ? parseFloat(ticker.P) >= 0 : true;

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
            <h1 className="coin-name-large">{id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Coin'} Price</h1>
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
                <div className="svg-container">
                  <svg 
                  viewBox="0 0 450 240" 
                  preserveAspectRatio="none" 
                  className="sparkline-svg"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isPositive ? "#00ff88" : "#ff4d4d"} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={isPositive ? "#00ff88" : "#ff4d4d"} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid Lines & Y-Axis Labels */}
                    {(() => {
                      const dataPoints = viewMode === 'live' 
                        ? priceHistory.map((p, i) => ({ price: p, time: i })) 
                        : historicalData;
                      const prices = dataPoints.map(d => d.price).filter(p => !isNaN(p));
                      if (prices.length === 0) return null;
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      const range = max - min || 1;
                      const steps = 4;
                      
                      const formatSmart = (val: number) => {
                        if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
                        if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
                        return val.toFixed(2);
                      };

                      return Array.from({ length: steps + 1 }).map((_, i) => {
                        const val = max - (i * range / steps);
                        const y = 20 + (i * 180 / steps);
                        return (
                          <React.Fragment key={`y-${i}`}>
                            <line x1="0" y1={y} x2="415" y2={y} stroke="rgba(255, 255, 255, 0.05)" />
                            <text x="418" y={y + 4} fill="#848e9c" fontSize="10">{formatSmart(val)}</text>
                          </React.Fragment>
                        );
                      });
                    })()}

                    {/* Chart Paths */}
                    {(() => {
                      const dataPoints = viewMode === 'live' 
                        ? priceHistory.map((p, i) => ({ price: p, time: i })) 
                        : historicalData;
                      const validPoints = dataPoints.filter(d => !isNaN(d.price));
                      if (validPoints.length === 0) return null;

                      const prices = validPoints.map(d => d.price);
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      const range = max - min || 1;
                      
                      const points = validPoints.map((d, i) => {
                        const x = (i / (validPoints.length - 1)) * 415;
                        const y = 200 - ((d.price - min) / range) * 180;
                        return { x, y };
                      });

                      const pathData = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
                      const areaData = `${pathData} L 415 200 L 0 200 Z`;

                      return (
                        <>
                          <path d={areaData} fill="url(#chartGradient)" />
                          <path d={pathData} fill="none" stroke={isPositive ? "#00ff88" : "#ff4d4d"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          
                          {/* Hover Tooltip Elements */}
                          {hoveredData && (
                            <>
                              <line 
                                x1={hoveredData.x} y1="20" 
                                x2={hoveredData.x} y2="200" 
                                stroke="rgba(255, 255, 255, 0.2)" 
                                strokeWidth="1" 
                                strokeDasharray="4 4" 
                              />
                              <circle 
                                cx={hoveredData.x} cy={hoveredData.y} 
                                r="4" 
                                fill={isPositive ? "#00ff88" : "#ff4d4d"} 
                                stroke="#121212" 
                                strokeWidth="2" 
                              />
                              
                              {/* Tooltip Box */}
                              <g>
                                <rect 
                                  x={Math.min(hoveredData.x + 10, 290)} 
                                  y={hoveredData.y - 45} 
                                  width="100" height="42" 
                                  rx="8" 
                                  fill="rgba(15, 15, 26, 0.98)" 
                                  stroke="rgba(99, 102, 241, 0.3)"
                                  strokeWidth="1"
                                />
                                <text 
                                  x={Math.min(hoveredData.x + 20, 300)} 
                                  y={hoveredData.y - 27} 
                                  fill="#ffffff" 
                                  fontSize="12" 
                                  fontWeight="700"
                                  fontFamily="Outfit, sans-serif"
                                >
                                  ₹{hoveredData.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </text>
                                <text 
                                  x={Math.min(hoveredData.x + 20, 300)} 
                                  y={hoveredData.y - 10} 
                                  fill="rgba(255, 255, 255, 0.5)" 
                                  fontSize="10"
                                  fontWeight="500"
                                  fontFamily="Outfit, sans-serif"
                                >
                                  {`${new Date(hoveredData.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${new Date(hoveredData.time).toLocaleDateString([], { month: 'short', day: 'numeric' })})`}
                                </text>
                              </g>
                            </>
                          )}
                        </>
                      );
                    })()}
                    {/* X-Axis Labels (Time) */}
                    {viewMode === 'historical' && historicalData.length > 0 && (() => {
                      const indices = [0, Math.floor(historicalData.length / 4), Math.floor(historicalData.length / 2), Math.floor(historicalData.length * 3 / 4), historicalData.length - 1];
                      return indices.map((idx, i) => {
                        const d = historicalData[idx];
                        const x = (idx / (historicalData.length - 1)) * 415;
                        const timeStr = new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <React.Fragment key={`x-${i}`}>
                            <line x1={x} y1="200" x2={x} y2="205" stroke="rgba(255, 255, 255, 0.1)" />
                            <text x={x} y="220" fill="#848e9c" fontSize="10" textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}>
                              {timeStr}
                            </text>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </svg>
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
              Buy {id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Coin'}
            </button>
            <button className="btn-sell" onClick={() => {
              if (user) {
                setActivePanel('sell');
              } else {
                navigate('/login');
              }
            }}>
              Sell {id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Coin'}
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
