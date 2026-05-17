import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Info, ShieldCheck, AlertCircle, Activity } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
import { apiFetch } from '../../../utils/api';
import './BuyCrypto.css';

interface BinanceTicker {
  c: string; // Last price
  o: string; // Open price
}

interface PortfolioItem {
  asset: string;
  quantity: number;
  avgBuyPrice: number;
}

const BuyCrypto: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // e.g., 'btc', 'usdc'
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const symbol = searchParams.get('symbol') || `${id}usdt`.toLowerCase();

  const navigate = useNavigate();
  const context = useOutletContext<{ user: any }>();
  const user = context?.user;

  const [ticker, setTicker] = useState<BinanceTicker | null>(null);
  const [inrRate, setInrRate] = useState<number | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [holdings, setHoldings] = useState<PortfolioItem[]>([]);
  const [selectedHolding, setSelectedHolding] = useState<PortfolioItem | null>(null);
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState<string>(''); // Can be INR or Crypto depending on logic
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ws = useRef<WebSocket | null>(null);

  // Fetch exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await apiFetch('http://localhost:8080/home/crypto/exchange-rate');
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

  // Fetch live price via WebSocket
  useEffect(() => {
    if (!symbol || inrRate === null) return;

    const lowerSymbol = symbol.toLowerCase();
    const binanceSymbol = lowerSymbol.endsWith('usdt') ? lowerSymbol : `${lowerSymbol}usdt`;
    
    // Direct Binance WebSocket
    const socketUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol}@miniTicker`;
    ws.current = new WebSocket(socketUrl);

    ws.current.onmessage = (event) => {
      const rawData = JSON.parse(event.data);
      // Binance miniTicker returns 'c' as close price
      setTicker({
        c: rawData.c,
        o: rawData.o
      });
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [symbol, inrRate]);

  // Fetch Portfolio
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await apiFetch('http://localhost:8080/portfolio/get');
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : [data];
          setHoldings(items);
          
          const currentAsset = id?.toUpperCase();
          const holding = items.find((h: PortfolioItem) => h.asset === currentAsset);
          setSelectedHolding(holding || null);
        }
      } catch (e) {
        console.error("Failed to fetch portfolio", e);
      }
    };
    if (user) {
      fetchPortfolio();
    }
  }, [user, id]);

  // Fetch user balance
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await apiFetch(`http://localhost:8080/user/profile`);
        if (res.ok) {
          const data = await res.json();
          setBalance(data.totalAmount || 0);
        }
      } catch (e) {
        console.error("Failed to fetch user profile", e);
      }
    };
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const currentPriceUsd = ticker ? parseFloat(ticker.c) : 0;
  const currentPriceInr = currentPriceUsd * (inrRate || 92.5);
  
  const priceChangePercent = ticker ? ((parseFloat(ticker.c) - parseFloat(ticker.o)) / parseFloat(ticker.o) * 100).toFixed(2) : '0.00';
  const isTrendUp = parseFloat(priceChangePercent) >= 0;

  const cryptoQuantity = tradeType === 'BUY' 
    ? (amount && currentPriceInr > 0 ? (parseFloat(amount) / currentPriceInr).toFixed(10) : '0')
    : amount || '0';

  const numericAmount = parseFloat(amount) || 0;
  
  // Validation
  const isInsufficientFunds = tradeType === 'BUY' && numericAmount > balance;
  const isInsufficientQuantity = tradeType === 'SELL' && numericAmount > (selectedHolding?.quantity || 0);
  const isBelowMinimum = tradeType === 'BUY' && numericAmount > 0 && numericAmount < 100;
  const isSellMinValid = tradeType === 'SELL' && numericAmount > 0;

  const handleMax = () => {
    if (tradeType === 'BUY') {
      setAmount(balance.toString());
    } else {
      setAmount(selectedHolding?.quantity.toString() || '0');
    }
  };

  const handleProceed = async () => {
    if (tradeType === 'BUY' && (numericAmount < 100 || numericAmount > balance)) return;
    if (tradeType === 'SELL' && (numericAmount <= 0 || numericAmount > (selectedHolding?.quantity || 0))) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const tradeAmount = tradeType === 'BUY' ? numericAmount : (numericAmount * currentPriceInr);
      const tradeQty = tradeType === 'BUY' ? parseFloat(cryptoQuantity) : numericAmount;

      const response = await apiFetch(`http://localhost:8080/trade/buy-sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders()
        },
        body: JSON.stringify({ 
          userId: user?.id,
          asset: id?.toUpperCase() || 'UNKNOWN',
          quantity: tradeQty,
          amount: tradeAmount,
          price: currentPriceInr,
          type: tradeType
        })
      });

      if (!response.ok) {
        let errMsg = 'Failed to process transaction';
        try {
          const errData = await response.json();
          errMsg = errData.message || errMsg;
        } catch(e) {}
        throw new Error(errMsg);
      }

      const responseText = await response.text();
      setSuccessMessage(responseText);
      
      if (tradeType === 'BUY') {
        setBalance(prev => prev - tradeAmount);
      } else {
        setBalance(prev => prev + tradeAmount);
      }
      
      setAmount('');
      setTimeout(() => {
        setSuccessMessage(null);
        navigate('/portfolio');
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Transaction failed. Please try again.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  const coinName = id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Coin';

  return (
    <div className="buy-crypto-page-container">
      <div className="buy-crypto-content-wrapper">
        <nav className="buy-nav-layer">
          <button className="nav-back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>
        </nav>

        <header className="buy-price-header-area">
          <div className="buy-coin-tagline">
            <span className="buy-symbol-badge-pnl">{id?.toUpperCase()} / INR</span>
          </div>
          <h1 className="buy-name-large-display">{coinName} Price</h1>
          
          <div className="buy-price-metrics">
            <div className={`buy-hero-price ${isTrendUp ? 'positive' : 'negative'}`}>
              <span className="hero-currency-mark">₹</span>
              {currentPriceInr > 0 ? currentPriceInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '---'}
            </div>
            
            <div className="buy-price-secondary-info">
              {currentPriceUsd > 0 && (
                <span className="buy-usd-equiv">
                  $ {currentPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              {inrRate && <span className="buy-rate-info-badge">Rate: ₹{inrRate}</span>}
              <div className={`buy-percentage-change ${isTrendUp ? 'trend-up' : 'trend-down'}`}>
                {isTrendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {priceChangePercent}%
              </div>
            </div>
          </div>
        </header>

        <div className="buy-action-panel-card">
          {/* Trade Type Toggle */}
          <div className="trade-type-tabs" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '1.5rem' }}>
            <button 
              className={`trade-tab ${tradeType === 'BUY' ? 'active' : ''}`}
              onClick={() => { setTradeType('BUY'); setAmount(''); }}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer', background: tradeType === 'BUY' ? '#bd34fe' : 'transparent', color: 'white', fontWeight: '600' }}
            >
              Buy
            </button>
            <button 
              className={`trade-tab ${tradeType === 'SELL' ? 'active' : ''}`}
              onClick={() => { setTradeType('SELL'); setAmount(''); }}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer', background: tradeType === 'SELL' ? '#f44336' : 'transparent', color: 'white', fontWeight: '600' }}
            >
              Sell
            </button>
          </div>

          {/* Holding Info Section - Styled like Portfolio Card */}
          {selectedHolding && (
            <div className="buy-holding-info" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(189, 52, 254, 0.05)', borderRadius: '16px', border: '1px solid rgba(189, 52, 254, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Your Holding</span>
                <span style={{ fontSize: '0.85rem', color: '#bd34fe', fontWeight: '600' }}>{selectedHolding.quantity} {id?.toUpperCase()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#94a3b8' }}>Avg. Buy Price</div>
                  <div style={{ fontWeight: '500' }}>{selectedHolding.avgBuyPrice ? `₹${selectedHolding.avgBuyPrice.toLocaleString('en-IN')}` : 'N/A'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#94a3b8' }}>Total Invested</div>
                  <div style={{ fontWeight: '500' }}>₹{(selectedHolding.quantity * selectedHolding.avgBuyPrice).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(189, 52, 254, 0.1)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Current Value</span>
                  <span style={{ color: '#10b981', fontWeight: '700' }}>₹{(selectedHolding.quantity * currentPriceInr).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}
          <div className="buy-input-section-block">
            <div className="buy-input-labels">
              <span>{tradeType === 'BUY' ? 'Amount to Spend (INR)' : `Quantity to Sell (${id?.toUpperCase()})`}</span>
              <span className="buy-qty-preview">
                {tradeType === 'BUY' 
                  ? `≈ ${parseFloat(cryptoQuantity).toFixed(6)} ${id?.toUpperCase()}` 
                  : `≈ ₹${(numericAmount * currentPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
              </span>
            </div>
            
            <div className={`buy-input-element-wrap ${(isInsufficientFunds || isInsufficientQuantity) ? 'error-border' : ''}`}>
              <span className="input-rupee-sign">{tradeType === 'BUY' ? '₹' : <Activity size={18} />}</span>
              <input 
                type="number" 
                placeholder={tradeType === 'BUY' ? "0.00" : "0.000000"} 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="buy-inr-numeric-input"
                min="0"
                step={tradeType === 'BUY' ? "1" : "0.0001"}
              />
            </div>
          </div>

          <div className="buy-wallet-balance-row">
            <div className="wallet-bal-detail">
              {tradeType === 'BUY' ? (
                <>
                  <Wallet size={16} />
                  <span>Available Balance: ₹{balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </>
              ) : (
                <>
                  <TrendingUp size={16} />
                  <span>Available {id?.toUpperCase()}: {selectedHolding?.quantity || 0}</span>
                </>
              )}
            </div>
          </div>

          <div className="buy-dynamic-controls-area">
            {successMessage ? (
              <div className="buy-success-msg" style={{ background: tradeType === 'BUY' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)', color: tradeType === 'BUY' ? '#4caf50' : '#2196f3' }}>
                <ShieldCheck size={20} /> {successMessage}
              </div>
            ) : (isInsufficientFunds || isInsufficientQuantity) ? (
              <div className="buy-insufficient-actions">
                <div className="insuf-warning-msg">
                  <AlertCircle size={16} /> {tradeType === 'BUY' ? 'Amount exceeds available balance' : `Low ${id?.toUpperCase()} balance`}
                </div>
                <div className="insuf-btn-group">
                  <button 
                    className="max-buy-text-btn" 
                    onClick={handleMax}
                  >
                    {tradeType === 'BUY' ? 'Use Max Balance' : `Sell All ${id?.toUpperCase()}`}
                  </button>
                  {tradeType === 'BUY' && (
                    <button 
                      className="add-funds-btn" 
                      onClick={() => navigate(`/profile`)}
                    >
                      Add Money
                    </button>
                  )}
                </div>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              {errorMessage && (
                <div className="insuf-warning-msg" style={{ color: '#ff4d4d', padding: '0.75rem', background: 'rgba(255, 77, 77, 0.05)', borderRadius: '8px' }}>
                  <AlertCircle size={16} /> {errorMessage}
                </div>
              )}
              {isBelowMinimum && (
                <div className="insuf-warning-msg" style={{ color: '#f59e0b' }}>
                  <AlertCircle size={16} /> Minimum amount is ₹100
                </div>
              )}
              <button 
                className={`execute-buy-proceed-btn ${tradeType === 'SELL' ? 'sell-btn' : ''}`} 
                onClick={handleProceed}
                disabled={(tradeType === 'BUY' && numericAmount < 100) || (tradeType === 'SELL' && numericAmount <= 0) || isProcessing}
                style={{ background: tradeType === 'SELL' ? '#f44336' : '#bd34fe' }}
              >
                {isProcessing ? 'Processing Transaction...' : `Proceed to ${tradeType === 'BUY' ? 'Buy' : 'Sell'} ${coinName}`}
              </button>
            </div>
          )}
          </div>
          
          <div className="buy-security-footer">
            <Info size={14} /> Transactions are secure and instantly reflected in your wallet.
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyCrypto;
