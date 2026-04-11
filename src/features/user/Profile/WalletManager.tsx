import React, { useState } from 'react';
import { getCsrfHeaders } from '../../../utils/csrf';

interface WalletManagerProps {
  balance: number;
  onClose: () => void;
  onUpdateBalance: (newBalance: number) => void;
  userId?: number;
}

const WalletManager: React.FC<WalletManagerProps> = ({ balance, onClose, onUpdateBalance, userId }) => {
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

  const handleTransaction = async (type: 'CREDIT' | 'DEBIT') => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (type === 'DEBIT' && val > balance) {
      setError("Insufficient funds");
      return;
    }
    
    if (!userId) {
      setError("User ID is missing! Cannot process transaction.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    // Calculate new balance locally upon successful transaction
    const newBalance = type === 'CREDIT' ? balance + val : balance - val;

    try {
      const res = await fetch(`http://localhost:8080/wallet/update`, {
        method: 'POST', // or POST depending on your backend
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders()
        },
        body: JSON.stringify({
          amount: val,
          type: type
        }),
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error("Transaction failed");
      }

      onUpdateBalance(newBalance);
      setAmount('');
      setSuccess(`Transaction successful! ${type === 'CREDIT' ? 'Credited' : 'Debited'} ${formatINR(val)}`);
      
      setTimeout(() => {
        setSuccess(null);
      }, 4000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Manage Wallet</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>
          ✕
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Current Balance</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)' }}>
          {formatINR(balance)}
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: '1rem' }}>{success}</div>}

      <div className="form-group">
        <label>Amount (INR):</label>
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 5000"
          min="1"
          step="any"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
        <button 
          onClick={() => handleTransaction('CREDIT')}
          disabled={loading}
          className="btn-main btn-primary-gradient" 
          style={{ width: '100%', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' }}
        >
          {loading ? '...' : '+ Credit'}
        </button>
        <button 
          onClick={() => handleTransaction('DEBIT')}
          disabled={loading}
          className="btn-main btn-primary-gradient" 
          style={{ width: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}
        >
          {loading ? '...' : '- Debit'}
        </button>
      </div>
    </div>
  );
};

export default WalletManager;
