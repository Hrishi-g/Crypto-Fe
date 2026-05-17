import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ShieldCheck, AlertCircle } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
import { apiFetch } from '../../../utils/api';
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
  ticker: BinanceTicker | null;
  inrRate: number | null;
  tradeType?: 'BUY' | 'SELL';
  onCancel: () => void;
}

const BuyCryptoWidget: React.FC<BuyCryptoWidgetProps> = ({ id, name, user, ticker, tradeType = 'BUY', onCancel }) => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);
  const [selectedHolding, setSelectedHolding] = useState<PortfolioItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState<string>(''); // Quantity for sell, INR for buy
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const [profileRes, portfolioRes] = await Promise.all([
          apiFetch(`http://localhost:8080/user/profile`, { credentials: 'include' }),
          apiFetch(`http://localhost:8080/portfolio/get`, { credentials: 'include' })
        ]);
        
        if (profileRes.ok) {
          const data = await profileRes.json();
          setBalance(Number(data.totalAmount || 0));
        }

        if (portfolioRes.ok) {
          const data = await portfolioRes.json();
          const items = Array.isArray(data) ? data : [data];
          const currentAsset = id?.toUpperCase();
          const holding = items.find((h: PortfolioItem) => h.asset === currentAsset);
          setSelectedHolding(holding || null);
        }
      } catch (e) {
        console.error("Failed to fetch user trade context", e);
      }
    };
    if (user) {
      fetchUserProfile();
    }
  }, [user, id]);

  // IMPORTANT: ticker.c passed from CoinDetail is ALREADY converted to INR
  const currentPriceInr = ticker ? parseFloat(ticker.c) : 0;
  
  const isSell = tradeType === 'SELL';
  const numericAmount = parseFloat(amount) || 0;
  
  const cryptoQuantity = !isSell 
    ? (numericAmount && currentPriceInr > 0 ? (numericAmount / currentPriceInr).toFixed(10) : '0')
    : amount || '0';

  const isInsufficientBalance = !isSell && numericAmount > balance;
  const isInsufficientQuantity = isSell && numericAmount > Number(selectedHolding?.quantity || 0);
  const isBelowMinimum = !isSell && numericAmount > 0 && numericAmount < 100;

  const handleMax = () => {
    if (!isSell) {
      setAmount(Number(balance).toString());
    } else {
      setAmount(String(selectedHolding?.quantity || 0));
    }
  };

  const handleProceed = async () => {
    if (!isSell && numericAmount < 100) return;
    if (isSell && numericAmount <= 0) return;
    if (isInsufficientBalance || isInsufficientQuantity) return;
    
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const tradeAmount = !isSell ? numericAmount : (numericAmount * currentPriceInr);
      const tradeQty = !isSell ? parseFloat(cryptoQuantity) : numericAmount;

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
      const tradeAmount1 = !isSell ? numericAmount : (numericAmount * currentPriceInr);
      setBalance(prev => Number(prev) + (isSell ? tradeAmount : -tradeAmount1));
      setAmount('');
      setTimeout(() => {
        setSuccessMessage(null);
        onCancel(); // return to stats grid
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Transaction failed. Please try again.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsProcessing(false);
    }
  };

  const coinName = name || (id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Coin');

  return (
    <div className="buy-widget-container">
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
            <span>{isSell ? `Quantity to Sell (${id?.toUpperCase()})` : 'Amount to Spend (INR)'}</span>
            <span className="buy-widget-qty-preview">
                {isSell 
                    ? (currentPriceInr > 0 ? `≈ ₹${(numericAmount * currentPriceInr).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '≈ ₹---')
                    : (currentPriceInr > 0 ? `≈ ${parseFloat(cryptoQuantity).toFixed(6)} ${id?.toUpperCase()}` : `≈ --- ${id?.toUpperCase()}`)}
            </span>
          </div>
          
          <div className={`buy-widget-input-wrapper ${(isInsufficientBalance || isInsufficientQuantity) ? 'error-state' : ''}`}>
            <span className="buy-widget-currency">{isSell ? '🔗' : '₹'}</span>
            <input 
              type="number" 
              placeholder={isSell ? "0.0000" : "0.00"} 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="buy-widget-input"
              min="0"
              step={isSell ? "0.0001" : "1"}
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
                {!isSell && (
                  <button 
                    className="widget-btn-add" 
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
                disabled={(isSell ? numericAmount <= 0 : numericAmount < 100) || isProcessing}
                style={{ background: isSell ? '#f44336' : '' }}
              >
                {isProcessing ? 'Processing...' : `Proceed to ${isSell ? 'Sell' : 'Buy'}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyCryptoWidget;
