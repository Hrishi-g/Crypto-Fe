import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Info, ShieldCheck, AlertCircle } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
import { apiFetch } from '../../../utils/api';
import CryptoIcon from '../../../components/CryptoIcon/CryptoIcon';
import toast from 'react-hot-toast';
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
  const { user, setUser } = useOutletContext<{ user: any, setUser: (user: any) => void }>();

  const [ticker, setTicker] = useState<BinanceTicker | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<PortfolioItem | null>(null);
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState<string>(''); // Can be INR or Crypto depending on logic
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

  const ws = useRef<WebSocket | null>(null);

  const queryClient = useQueryClient();

  const { data: inrRate = 92.5 } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async () => {
      const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/home/crypto/exchange-rate`);
      if (!res.ok) return 92.5;
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

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



  const { data: holdings = [] } = useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: async () => {
      const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/portfolio/get`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [data];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (holdings.length > 0 && id) {
      const currentAsset = id.toUpperCase();
      const holding = holdings.find((h: PortfolioItem) => h.asset === currentAsset);
      setSelectedHolding(holding || null);
    }
  }, [holdings, id]);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/user/profile`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const balance = userProfile?.totalAmount || 0;

  const currentPriceUsd = ticker ? parseFloat(ticker.c) : 0;
  const currentPriceInr = currentPriceUsd * (inrRate || 92.5);
  
  const priceChangePercent = ticker ? ((parseFloat(ticker.c) - parseFloat(ticker.o)) / parseFloat(ticker.o) * 100).toFixed(2) : '0.00';
  const isTrendUp = parseFloat(priceChangePercent) >= 0;

  const numericAmount = parseFloat(amount) || 0;
  const cryptoQuantity = (numericAmount / (currentPriceInr || 1)).toFixed(8);
  
  // Validation
  const isInsufficientFunds = tradeType === 'BUY' && numericAmount > balance;
  const isInsufficientQuantity = tradeType === 'SELL' && Number(cryptoQuantity) > (selectedHolding?.quantity || 0);

  const isBelowMinimum = numericAmount > 0 && numericAmount < 100;

  const handleMax = () => {
    if (tradeType === 'BUY') {
      setAmount(balance.toString());
    } else if (tradeType === 'SELL' && selectedHolding) {
      const maxInr = Number(selectedHolding.quantity) * currentPriceInr;
      setAmount(maxInr.toString());
    } else {
      setAmount('0');
    }
  };

  const executeTrade = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const tradeAmount = numericAmount;
      const tradeQty = parseFloat(cryptoQuantity);

      const response = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/trade/buy-sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders(),
          'Idempotency-Key': idempotencyKey
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
      
      const newBal = tradeType === 'BUY' ? balance - tradeAmount : balance + tradeAmount;
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', user?.id] });
      if (setUser) {
        setUser((prev: any) => prev ? { ...prev, totalAmount: newBal } : null);
      }
      
      setAmount('');
      setIdempotencyKey(crypto.randomUUID());
      setTimeout(() => {
        setSuccessMessage(null);
        navigate('/portfolio');
      }, 3000);

    } catch (err: any) {
      setErrorMessage(err.message || 'Transaction failed. Please try again.');
      setIdempotencyKey(crypto.randomUUID());
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceed = () => {
    const profile = userProfile || user;
    if (!profile?.firstName || !profile?.lastName || (!profile?.hasDob && !profile?.dob)) {
      toast.error('Please complete your profile details to perform trades.', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      navigate('/profile');
      return;
    }
    if (tradeType === 'BUY' && numericAmount < 100) return;
    if (tradeType === 'SELL' && numericAmount < 100) return;
    if (tradeType === 'SELL' && Number(cryptoQuantity) > (selectedHolding?.quantity || 0)) return;
    setShowConfirmModal(true);
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
          <div className="buy-coin-tagline" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CryptoIcon symbol={id || 'btc'} size={40} />
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
              <span>Amount to {tradeType === 'BUY' ? 'Spend' : 'Receive'} (INR)</span>
              <span className="buy-qty-preview">
                {`≈ ${cryptoQuantity} ${id?.toUpperCase()}`}
              </span>
            </div>
            
            <div className={`buy-input-element-wrap ${(isInsufficientFunds || isInsufficientQuantity) ? 'error-border' : ''}`}>
              <span className="currency-prefix">₹</span>
              <input 
                type="number" 
                placeholder="0.00" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="buy-inr-numeric-input"
                min="0"
                step="1"
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
                disabled={numericAmount < 100 || isProcessing}
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

      {showConfirmModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal-title">Confirm {tradeType === 'BUY' ? 'Purchase' : 'Sale'}</h3>
            <div className="confirm-modal-details">
              <div className="confirm-detail-row">
                <span className="confirm-label">Asset</span>
                <span className="confirm-value">{coinName} ({id?.toUpperCase()})</span>
              </div>
              <div className="confirm-detail-row">
                <span className="confirm-label">Action</span>
                <span className={`confirm-value trade-type-${tradeType.toLowerCase()}`}>
                  {tradeType}
                </span>
              </div>
              <div className="confirm-detail-row">
                <span className="confirm-label">Current Price</span>
                <span className="confirm-value">₹{currentPriceInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              </div>
              <div className="confirm-detail-row">
                <span className="confirm-label">Quantity</span>
                <span className="confirm-value">
                  {tradeType === 'BUY' 
                    ? `${parseFloat(cryptoQuantity).toFixed(6)} ${id?.toUpperCase()}`
                    : `${numericAmount.toFixed(6)} ${id?.toUpperCase()}`}
                </span>
              </div>
              <div className="confirm-detail-row highlight-row">
                <span className="confirm-label">Total Cost</span>
                <span className="confirm-value">
                  ₹{(tradeType === 'BUY' ? numericAmount : (numericAmount * currentPriceInr)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-main btn-outline" 
                onClick={() => setShowConfirmModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn-main" 
                onClick={() => {
                  setShowConfirmModal(false);
                  executeTrade();
                }}
                style={{ flex: 1, background: tradeType === 'SELL' ? '#f44336' : '#bd34fe', color: 'white', border: 'none' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BuyCrypto;
