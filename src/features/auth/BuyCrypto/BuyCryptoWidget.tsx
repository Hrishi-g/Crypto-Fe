import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, ShieldCheck, AlertCircle } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
import { apiFetch } from '../../../utils/api';
import toast from 'react-hot-toast';
import './BuyCryptoWidget.css';

interface BinanceTicker {
  c: string; // Last price
  P: string; // Price change percent
}

interface PortfolioItem {
  asset: string;
  quantity: number;
  avgBuyPrice: number;
}

interface BuyCryptoWidgetProps {
  id?: string;
  name?: string;
  symbol?: string;
  user: any;
  setUser?: (u: any) => void;
  ticker: BinanceTicker | null;
  inrRate: number | null;
  tradeType?: 'BUY' | 'SELL';
  onCancel: () => void;
}

const BuyCryptoWidget: React.FC<BuyCryptoWidgetProps> = ({ id, name, user, setUser, ticker, tradeType = 'BUY', onCancel }) => {
  const navigate = useNavigate();
  const [selectedHolding, setSelectedHolding] = useState<PortfolioItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState<string>(''); // Always INR amount for both Buy and Sell
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const queryClient = useQueryClient();

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/user/profile`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const { data: portfolioItems = [] } = useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: async () => {
      const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/portfolio/get`, { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [data];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (portfolioItems.length > 0 && id) {
      const currentAsset = id.toUpperCase();
      const holding = portfolioItems.find((h: PortfolioItem) => h.asset === currentAsset);
      setSelectedHolding(holding || null);
    }
  }, [portfolioItems, id]);

  const balance = Number(userProfile?.totalAmount || 0);

  // IMPORTANT: ticker.c passed from CoinDetail is ALREADY converted to INR
  const currentPriceInr = ticker ? parseFloat(ticker.c) : 0;
  
  const isSell = tradeType === 'SELL';
  const numericAmount = parseFloat(amount) || 0;
  
  const cryptoQuantity = (numericAmount && currentPriceInr > 0) ? (numericAmount / currentPriceInr).toFixed(8) : '0';

  const isInsufficientBalance = !isSell && numericAmount > balance;
  const isInsufficientQuantity = isSell && Number(cryptoQuantity) > Number(selectedHolding?.quantity || 0);
  const isBelowMinimum = numericAmount > 0 && numericAmount < 100;

  const handleMax = () => {
    if (!isSell) {
      setAmount(Number(balance).toString());
    } else {
      const maxInr = Number(selectedHolding?.quantity || 0) * currentPriceInr;
      setAmount(maxInr.toString());
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
        }),
        credentials: 'include'
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

      // Fetch and update global user state with latest balance/details
      try {
        const profileRes = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/user/profile`, { credentials: 'include' });
        if (profileRes.ok) {
          const latestProfile = await profileRes.json();
          if (setUser) {
            setUser(latestProfile);
          }
        }
      } catch (err) {
        // Failed to update user context after trade silently
      }

      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', user?.id] });
      setAmount('');
      setIdempotencyKey(crypto.randomUUID());
      setTimeout(() => {
        setSuccessMessage(null);
        onCancel(); // return to stats grid
      }, 3000);

    } catch (err: any) {
      // Transaction execution failed silently
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
    if (numericAmount < 100) return;
    if (isInsufficientBalance || isInsufficientQuantity) return;
    setShowConfirmModal(true);
  };

  const coinName = name || (id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Coin');

  return (
    <div className="glass-card buy-widget-container">
      <div className="buy-widget-header">
        <h4>{isSell ? 'Sell' : 'Buy'} {coinName} instantly</h4>
        <button className="widget-close-btn" onClick={onCancel}>&times;</button>
      </div>

      <div className="buy-widget-content">
        {selectedHolding && (
           <div className="widget-holding-info">
             <div className='widget-holding-info-row'>
              <div className='row'>
                 <span className='row-label'>Holdings: </span>
                 <span className='row-value'>{Number(selectedHolding.quantity || 0)} {id?.toUpperCase()}</span>
              </div>
              <div className='row'>
                 <span className='row-label'>Avg Buy Price: </span>
                 <span className='row-value'>₹{Number(selectedHolding.avgBuyPrice || 0).toFixed(2)}</span>
              </div>
              <div className='row'>
                 <span className='row-label'>Invested: </span>
                 <span className='row-value'>₹{(Number(selectedHolding.quantity || 0) * Number(selectedHolding.avgBuyPrice || 0)).toLocaleString()}</span>
              </div>
              <div className='row'>
                 <span className='row-label'>Current Value: </span>
                 <span className='row-value-sp'>
                   {currentPriceInr > 0 
                     ? `₹${(Number(selectedHolding.quantity || 0) * currentPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` 
                     : '₹---'}
                 </span>
              </div>
             </div>
           </div>
        )}

        <div className="buy-widget-input-group">
          <div className="buy-widget-labels">
            <span>Amount to {isSell ? 'Receive' : 'Spend'} (INR)</span>
            <span className="buy-widget-qty-preview">
                {currentPriceInr > 0 ? `≈ ${parseFloat(cryptoQuantity).toFixed(6)} ${id?.toUpperCase()}` : `≈ --- ${id?.toUpperCase()}`}
            </span>
          </div>
          
          <div className={`buy-widget-input-wrapper ${(isInsufficientBalance || isInsufficientQuantity) ? 'error-state' : ''}`}>
            <span className="buy-widget-currency">₹</span>
            <input 
              type="number" 
              placeholder="0.00" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="buy-widget-input"
              min="0"
              step="1"
            />
          </div>
        </div>

        <div className="buy-widget-wallet-row">
          <div className="buy-widget-balance-badge">
            {!isSell ? (
                <>
                    <Wallet size={14} />
                    Available: ₹{Number(balance).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </>
            ) : (
                <>
                    <ShieldCheck size={14} />
                    In Portfolio: {Number(selectedHolding?.quantity || 0)} {id?.toUpperCase()}
                </>
            )}
          </div>
        </div>

        <div className="buy-widget-actions">
          {successMessage ? (
            <div className="buy-widget-success">
              <ShieldCheck size={20} /> {successMessage}
            </div>
          ) : (isInsufficientBalance || isInsufficientQuantity) ? (
            <div className="buy-widget-insufficient">
              <div className="insuf-alert">
                <AlertCircle size={14} /> {isSell ? `Low ${id?.toUpperCase()} balance` : 'Exceeds balance'}
              </div>
              <div className="insuf-btn-row">
                <button 
                  className="widget-btn-max" 
                  onClick={handleMax}
                >
                  {isSell ? 'Sell All' : 'Use Max'}
                </button>
                {/* Min/Max info string removed for simplicity since both use INR now */}
                  <button 
                    className="widget-btn-add" 
                    onClick={() => navigate(`/profile`)}
                  >
                    Add Money
                  </button>

              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              {errorMessage && (
                <div className="insuf-alert" style={{ color: '#ff4d4d', padding: '0.75rem', background: 'rgba(255, 77, 77, 0.05)', borderRadius: '8px' }}>
                  <AlertCircle size={14} /> {errorMessage}
                </div>
              )}
              {isBelowMinimum && (
                <div className="insuf-alert" style={{ color: '#f59e0b' }}>
                  <AlertCircle size={14} /> Minimum amount is ₹100
                </div>
              )}
              <button 
                className={`widget-btn-proceed ${isSell ? 'sell-mode' : ''}`} 
                onClick={handleProceed}
                disabled={(numericAmount < 100) || isProcessing}
                style={{ background: isSell ? '#f44336' : '' }}
              >
                {isProcessing ? 'Processing...' : `Proceed to ${isSell ? 'Sell' : 'Buy'}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {showConfirmModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="glass-card confirm-modal" onClick={(e) => e.stopPropagation()}>
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

export default BuyCryptoWidget;
