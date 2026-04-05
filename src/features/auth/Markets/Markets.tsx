import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import './Markets.css';

interface CryptoCoin {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
  market_cap: number;
  market_cap_rank: number;
  high_24h: number;
  low_24h: number;
}

const Markets: React.FC = () => {
  const navigate = useNavigate();
  const [cryptoData, setCryptoData] = useState<CryptoCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const perPage = 10;

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // Reset to page 1 on search
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchAllCrypto = async () => {
      setLoading(true);
      try {
        const queryParam = debouncedQuery ? `&query=${encodeURIComponent(debouncedQuery)}` : '';
        const response = await fetch(`http://localhost:8080/home/crypto/all-crypto?page=${page}&perPage=${perPage}${queryParam}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCryptoData(data);
        }
      } catch (error) {
        console.error("Error fetching all crypto data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllCrypto();
  }, [page, debouncedQuery]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1.0e12) return (value / 1.0e12).toFixed(2) + " T";
    if (value >= 1.0e9) return (value / 1.0e9).toFixed(2) + " B";
    if (value >= 1.0e6) return (value / 1.0e6).toFixed(2) + " M";
    return value.toLocaleString();
  };

  const handleTrade = (coin: CryptoCoin) => {
    navigate(`/coin/${coin.id}?symbol=${coin.symbol.toLowerCase()}`); 
  };

  return (
    <div className="markets-wrapper">
      <div className="markets-container">
        <header className="markets-header">
          {/* <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} /> Back to Dashboard
          </button> */}
          <h1 className="markets-title">Market <span>Explorer</span></h1>
          <p className="markets-subtitle">Real-time data for over 100+ digital assets globally.</p>
        </header>

        <div className="search-container">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search by coin name or symbol (e.g. 'bitcoin' or 'eth')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="crypto-loader">
              <div className="loader-circle"></div>
              <div className="loader-coin">₿</div>
            </div>
            <div className="loader-text">FETCHING MARKET INTELLIGENCE...</div>
          </div>
        ) : (
          <>
            <div className="market-table-container">
              <table className="market-table">
                <thead>
                  <tr>
                    <th className="h-rank">#</th>
                    <th>Name</th>
                    <th className="h-price">Price</th>
                    <th className="h-change">24h Change</th>
                    <th className="h-hl">24h High/Low</th>
                    <th className="h-cap">Market Cap</th>
                    <th className="h-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cryptoData.map((coin) => (
                    <tr key={coin.id}>
                      <td className="rank-cell c-rank">{coin.market_cap_rank}</td>
                      <td 
                        className="name-cell clickable" 
                        onClick={() => handleTrade(coin)}
                      >
                        <div className="coin-info-wide">
                          <img src={coin.image} alt={coin.name} className="coin-icon-small" />
                          <div className="coin-names">
                            <span className="coin-name">{coin.name}</span>
                            <span className="coin-symbol">{coin.symbol.toUpperCase()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="price-cell">{formatCurrency(coin.current_price)}</td>
                      <td className={`change-cell ${coin.price_change_percentage_24h >= 0 ? 'up' : 'down'}`}>
                        <div className="change-content">
                          {coin.price_change_percentage_24h >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </div>
                      </td>
                      <td className="high-low-cell c-hl">
                        <div className="hl-values">
                          <span className="hl-high">H: {formatCurrency(coin.high_24h)}</span>
                          <span className="hl-low">L: {formatCurrency(coin.low_24h)}</span>
                        </div>
                      </td>
                      <td className="cap-cell c-cap">{formatMarketCap(coin.market_cap)}</td>
                      <td className="action-cell c-action">
                        <button 
                          className="btn-main btn-primary-gradient compact-btn"
                          onClick={() => handleTrade(coin)}
                        >
                          Trade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!debouncedQuery && (
              <div className="pagination">
                <button 
                  className="nav-btn" 
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={20} /> Previous
                </button>
                <div className="page-indicator">Page {page}</div>
                <button 
                  className="nav-btn" 
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={cryptoData.length < perPage}
                >
                  Next <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Markets;
