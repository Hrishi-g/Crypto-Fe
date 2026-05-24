import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, Clock, Download, ChevronLeft } from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import './WalletHistory.css';

interface Transaction {
  type: string;
  asset: string;
  createdAt: string;
  quantity: number;
  price: number;
  amount: number;
  balanceAfter: number;
  status: string;
}

const WalletHistory: React.FC = () => {
  const { user, isAuth } = useOutletContext<{ user: any, isAuth: boolean }>();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!isAuth && !user) {
      navigate('/login');
      return;
    }
    
    if (isAuth && !user) return;

    const fetchHistory = async (pageToFetch: number) => {
      try {
        if (pageToFetch === 0) setLoading(true);
        else setLoadingMore(true);

        if (pageToFetch === 0) {
          const [response, profileRes] = await Promise.all([
            apiFetch(`${import.meta.env.VITE_BACKEND_URL}/wallet/history?page=${pageToFetch}&size=${PAGE_SIZE}`),
            apiFetch(`${import.meta.env.VITE_BACKEND_URL}/user/profile`)
          ]);

          if (!response.ok || !profileRes.ok) {
            throw new Error('Failed to fetch transaction data');
          }

          const data = await response.json();
          const profileData = await profileRes.json();
          
          setCurrentBalance(profileData.totalAmount || 0);

          const newTransactions = Array.isArray(data) ? data : (data.content || []);
          setTransactions(newTransactions);

          if (data.last !== undefined) {
            setHasMore(!data.last);
          } else {
            setHasMore(newTransactions.length === PAGE_SIZE);
          }
        } else {
          const response = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/wallet/history?page=${pageToFetch}&size=${PAGE_SIZE}`);

          if (!response.ok) {
            throw new Error('Failed to fetch transaction history');
          }

          const data = await response.json();
          const newTransactions = Array.isArray(data) ? data : (data.content || []);
          
          setTransactions(prev => [...prev, ...newTransactions]);

          if (data.last !== undefined) {
            setHasMore(!data.last);
          } else {
            setHasMore(newTransactions.length === PAGE_SIZE);
          }
        }

      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching history');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchHistory(0);
  }, [user, isAuth, navigate]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    
    try {
      setLoadingMore(true);
      const response = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/wallet/history?page=${nextPage}&size=${PAGE_SIZE}`);

      if (!response.ok) {
        throw new Error('Failed to fetch more transactions');
      }

      const data = await response.json();
      const newTransactions = Array.isArray(data) ? data : (data.content || []);
      
      setTransactions(prev => [...prev, ...newTransactions]);

      if (data.last !== undefined) {
        setHasMore(!data.last);
      } else {
        setHasMore(newTransactions.length === PAGE_SIZE);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTxDetails = (tx: Transaction) => {
    const type = tx.type.toUpperCase();
    const status = tx.status ? tx.status.toUpperCase() : 'SUCCESS';
    const isPositive = (type === 'CREDIT' || type === 'SELL') && status === 'SUCCESS';
    
    let title = '';
    let Icon = Clock;

    switch (type) {
      case 'CREDIT':
        title = status === 'FAILED' ? 'Wallet Deposit (Failed)' : (status === 'PENDING' ? 'Wallet Deposit (Pending)' : 'Wallet Deposit');
        Icon = ArrowDownLeft;
        break;
      case 'DEBIT':
        title = status === 'FAILED' ? 'Wallet Withdrawal (Failed)' : (status === 'PENDING' ? 'Wallet Withdrawal (Pending)' : 'Wallet Withdrawal');
        Icon = ArrowUpRight;
        break;
      case 'BUY':
        title = status === 'FAILED' ? `Buy ${tx.asset} (Failed)` : `Bought ${tx.asset}`;
        Icon = ArrowUpRight;
        break;
      case 'SELL':
        title = status === 'FAILED' ? `Sell ${tx.asset} (Failed)` : `Sold ${tx.asset}`;
        Icon = ArrowDownLeft;
        break;
      default:
        title = 'Transaction';
        Icon = Clock;
    }

    return { title, Icon, isPositive, status };
  };

  if (loading) {
    return (
      <div className="wallet-history-wrapper loading-container">
        <div className="spinner"></div>
        <p>Fetching transactions...</p>
      </div>
    );
  }

  return (
    <div className="wallet-history-wrapper">
      <div className="history-header-nav">
        <button className="back-btn" onClick={() => navigate('/portfolio')}>
          <ChevronLeft size={28} />
        </button>
        <h2>All Transactions</h2>
        <button className="download-btn">
          <Download size={20} />
        </button>
      </div>

      <div className="balance-summary">
        <span className="balance-label">Available Balance</span>
        <span className="balance-amount1">{formatCurrency(currentBalance)}</span>
      </div>

      {error ? (
        <div className="empty-state">
          <p>{error}</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <h3>No activity found</h3>
          <p>Your transactions will appear here.</p>
        </div>
      ) : (
        <div className="transaction-list">
          {transactions.map((tx, index) => {
            const { title, Icon, isPositive, status } = getTxDetails(tx);
            return (
              <div key={index} className="transaction-item">
                <div className="tx-icon-container">
                  <Icon size={24} color={status === 'FAILED' ? '#ef4444' : (isPositive ? '#22c55e' : '#94a3b8')} />
                </div>
                <div className="tx-details">
                  <div className="tx-title" style={{ color: status === 'FAILED' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{title}</div>
                  <div className="tx-date">{formatDate(tx.createdAt)}</div>
                </div>
                <div className="tx-amount-section">
                  <div className={`tx-amount ${status === 'FAILED' ? 'failed' : (isPositive ? 'positive' : '')}`}>
                    {status === 'FAILED' ? '' : (isPositive ? '+' : '')}{formatCurrency(tx.amount)}
                  </div>
                  <div className="tx-balance-after">
                    {status === 'FAILED' ? 'FAILED' : (status === 'PENDING' ? 'PENDING' : `Bal: ${formatCurrency(tx.balanceAfter)}`)}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="load-more-container">
              <button 
                className="btn-load-more" 
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <div className="spinner-small"></div>
                ) : (
                  'Load More Transactions'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletHistory;
