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
}

const WalletHistory: React.FC = () => {
  const { user, isAuth } = useOutletContext<{ user: any, isAuth: boolean }>();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

        const response = await apiFetch(`http://localhost:8080/wallet/history?page=${pageToFetch}&size=${PAGE_SIZE}`);

        if (!response.ok) {
          throw new Error('Failed to fetch transaction history');
        }

        const data = await response.json();
        const newTransactions = Array.isArray(data) ? data : (data.content || []);
        
        if (pageToFetch === 0) {
          setTransactions(newTransactions);
        } else {
          setTransactions(prev => [...prev, ...newTransactions]);
        }

        // Check if there's more to load
        // If it's a Page object from Spring, use data.last. Otherwise, check length.
        if (data.last !== undefined) {
          setHasMore(!data.last);
        } else {
          setHasMore(newTransactions.length === PAGE_SIZE);
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
      const response = await apiFetch(`http://localhost:8080/wallet/history?page=${nextPage}&size=${PAGE_SIZE}`);

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
    const isPositive = type === 'CREDIT' || type === 'SELL';
    
    let title = '';
    let Icon = Clock;

    switch (type) {
      case 'CREDIT':
        title = 'Wallet Deposit';
        Icon = ArrowDownLeft;
        break;
      case 'DEBIT':
        title = 'Wallet Withdrawal';
        Icon = ArrowUpRight;
        break;
      case 'BUY':
        title = `Bought ${tx.asset}`;
        Icon = ArrowUpRight;
        break;
      case 'SELL':
        title = `Sold ${tx.asset}`;
        Icon = ArrowDownLeft;
        break;
      default:
        title = 'Transaction';
        Icon = Clock;
    }

    return { title, Icon, isPositive };
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
        <span className="balance-amount1">{formatCurrency(transactions.length > 0 ? transactions[0].balanceAfter : (user?.wallet?.balance || 0))}</span>
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
            const { title, Icon, isPositive } = getTxDetails(tx);
            return (
              <div key={index} className="transaction-item">
                <div className="tx-icon-container">
                  <Icon size={24} color={isPositive ? '#22c55e' : '#94a3b8'} />
                </div>
                <div className="tx-details">
                  <div className="tx-title">{title}</div>
                  <div className="tx-date">{formatDate(tx.createdAt)}</div>
                </div>
                <div className="tx-amount-section">
                  <div className={`tx-amount ${isPositive ? 'positive' : ''}`}>
                    {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                  </div>
                  <div className="tx-balance-after">
                    Bal: {formatCurrency(tx.balanceAfter)}
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
