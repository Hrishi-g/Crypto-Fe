import React, { useState, useEffect } from 'react';
import { getCsrfHeaders } from '../../../utils/csrf';
import { apiFetch } from '../../../utils/api';
import { ArrowUpCircle, ArrowDownCircle, IndianRupee, Loader2 } from 'lucide-react';

interface WalletManagerProps {
  balance: number;
  onClose: () => void;
  onUpdateBalance: (newBalance: number) => void;
  userId?: number;
}

const WalletManager: React.FC<WalletManagerProps> = ({ balance, onUpdateBalance }) => {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const cleanupRazorpay = () => {
    // 1. Remove the script tag if present
    const script = document.getElementById('razorpay-script');
    if (script) {
      script.remove();
    }
    // 2. Remove the Razorpay global object to prevent stale state issues
    if ((window as any).Razorpay) {
      delete (window as any).Razorpay;
    }
    // 3. Remove all leftover Razorpay iframe containers from the DOM
    const containers = document.querySelectorAll('.razorpay-container');
    containers.forEach(container => container.remove());
  };

  useEffect(() => {
    // Cleanup Razorpay DOM elements when component unmounts
    return () => {
      cleanupRazorpay();
    };
  }, []);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleTransaction = async (type: 'CREDIT' | 'DEBIT') => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (val < 100) {
      setError(`Minimum ${type === 'CREDIT' ? 'deposit' : 'withdrawal'} amount is ₹100.00`);
      return;
    }
    if (type === 'DEBIT' && val > balance) {
      setError("Insufficient funds in your wallet");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (type === 'CREDIT') {
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
        }

        const orderRes = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/payment/razorpay/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getCsrfHeaders()
          },
          body: JSON.stringify(val)
        });

        if (!orderRes.ok) {
          const errText = await orderRes.text();
          throw new Error(errText || "Failed to create payment order");
        }

        const orderData = await orderRes.json();

        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Cryptx",
          description: "Wallet Deposit",
          order_id: orderData.orderId,
          handler: async (response: any) => {
            setLoading(true);
            try {
              const verifyRes = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/payment/razorpay/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...getCsrfHeaders()
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: val
                })
              });

              if (!verifyRes.ok) {
                const verifyErr = await verifyRes.json();
                throw new Error(verifyErr.message || "Payment verification failed");
              }

              onUpdateBalance(balance + val);
              setAmount('');
              setSuccess(`Successfully credited ${formatINR(val)} via Razorpay`);
              setTimeout(() => setSuccess(null), 4000);
            } catch (err: any) {
              setError(err.message || "Verification failed");
            } finally {
              setLoading(false);
              cleanupRazorpay();
            }
          },
          theme: {
            color: "#bd34fe"
          },
          modal: {
            ondismiss: async () => {
              setLoading(false);
              cleanupRazorpay();
              try {
                await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/payment/razorpay/cancel`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...getCsrfHeaders()
                  },
                  body: JSON.stringify({ orderId: orderData.orderId })
                });
              } catch (e) {
                // Failed to cancel payment in DB silently
              }
            }
          }
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();

      } catch (err: any) {
        setError(err.message || "Razorpay setup failed");
        setLoading(false);
        cleanupRazorpay();
      }
    } else {
      // DEBIT (Withdrawal) flow
      const newBalance = balance - val;
      try {
        const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/wallet/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getCsrfHeaders()
          },
          body: JSON.stringify({
            amount: val,
            type: type
          })
        });

        if (!res.ok) {
          throw new Error("Transaction failed. Please try again.");
        }

        onUpdateBalance(newBalance);
        setAmount('');
        setSuccess(`Successfully debited ${formatINR(val)}`);
        
        setTimeout(() => {
          setSuccess(null);
        }, 4000);
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="wallet-manager-inner">
      <div className="wallet-balance-display">
        <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Current Available Balance
        </div>
        <div className="balance-amount">
          {formatINR(balance)}
        </div>
      </div>

      {error && <div className="error-message" style={{ margin: '1rem 0' }}>{error}</div>}
      {success && <div className="success-message" style={{ margin: '1rem 0' }}>{success}</div>}

      <div className="form-group" style={{ marginBottom: '2rem' }}>
        <label><IndianRupee size={14} /> Enter Amount to {amount ? 'Transfer' : 'Deposit/Withdraw'}</label>
        <div className="input-wrapper">
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="100"
              step="any"
              style={{ fontSize: '1.5rem', padding: '16px 20px', textAlign: 'center' }}
            />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <button 
          onClick={() => handleTransaction('CREDIT')}
          disabled={loading}
          className="btn-main" 
          style={{ 
            width: '100%', 
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
            boxShadow: '0 10px 20px rgba(34, 197, 94, 0.2)',
            border: 'none',
            color: 'white',
            padding: '16px',
            borderRadius: '16px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          {loading ? <Loader2 className="animate-spin" /> : <><ArrowUpCircle size={20} /> Deposit</>}
        </button>
        <button 
          onClick={() => handleTransaction('DEBIT')}
          disabled={loading}
          className="btn-main" 
          style={{ 
            width: '100%', 
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
            boxShadow: '0 10px 20px rgba(239, 68, 68, 0.2)',
            border: 'none',
            color: 'white',
            padding: '16px',
            borderRadius: '16px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        >
          {loading ? <Loader2 className="animate-spin" /> : <><ArrowDownCircle size={20} /> Withdraw</>}
        </button>
      </div>
      
      <div style={{ marginTop: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        <p>Transactions are processed instantly and secured with 256-bit encryption.</p>
      </div>
    </div>
  );
};

export default WalletManager;
