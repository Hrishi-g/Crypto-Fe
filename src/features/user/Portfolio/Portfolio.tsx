import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, PieChart, History } from 'lucide-react';
import { apiFetch } from '../../../utils/api';
import CryptoIcon from '../../../components/CryptoIcon/CryptoIcon';

import './Portfolio.css';

interface PortfolioItem {
  asset: string;
  quantity: number;
  avgBuyPrice: number;
}



const Portfolio: React.FC = () => {
  const { user, isAuth } = useOutletContext<{ user: any, isAuth: boolean }>();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuth && !user) {
      navigate('/login');
    }
  }, [isAuth, user, navigate]);

  const { data: portfolioData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: async () => {
      const response = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/portfolio/get`);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data');
      }
      return response.json();
    },
    enabled: !!user && isAuth,
  });

  const error = queryError ? queryError.message : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="portfolio-container loading">
        <div className="crypto-loader">
          <div className="loader-circle"></div>
          <div className="loader-coin">₿</div>
        </div>
        <div className="loader-text">LOADING PORTFOLIO...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-container error">
        <h2>Oops!</h2>
        <p>{error}</p>
        <button className="btn-main btn-outline" onClick={() => navigate('/')}>
          Go to Home
        </button>
      </div>
    );
  }

  const items = Array.isArray(portfolioData) 
    ? portfolioData 
    : portfolioData ? [portfolioData] : [];

  return (
    <div className="portfolio-wrapper">
      <div className="portfolio-header">
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1><PieChart size={32} className="header-icon"/> My Portfolio</h1>
              <p className="subtitle">Track and manage your crypto assets</p>
            </div>
          </div>
        </div>
         <button 
              className="btn-main btn-outline" 
              onClick={() => navigate('/wallet/history')}
              style={{ gap: '10px' }}
            >
              <History size={18} /> Transaction History
            </button>
        <div className="portfolio-summary">
          <div 
            className="summary-card clickable" 
            onClick={() => navigate(`/profile`, { state: { showWallet: true } })}
            title="Manage Wallet"
          >
            <span className="summary-label">Total Balance</span>
            <h2 className="summary-value">{formatCurrency(user?.totalAmount || user?.wallet?.balance || 0)}</h2>
          </div>
        </div>
      </div>

      <div className="portfolio-list">
        {items.length === 0 ? (
          <div className="empty-portfolio">
            <Wallet size={48} className="empty-icon" />
            <h3>Your portfolio is empty</h3>
            <p>Start trading to build your crypto portfolio today.</p>
            <button className="btn-main btn-primary-gradient" onClick={() => navigate('/markets')}>
              Explore Markets
            </button>
          </div>
        ) : (
           <div className="asset-grid">
             {items.map((item, idx) => (
               <div key={idx} className="glass-card asset-card">
                 <div className="asset-info">
                  <CryptoIcon symbol={item.asset || 'Crypto'} />
                   <div className="asset-details">
                     <h3>{item.asset}</h3>
                     <span className="asset-quantity">{item.quantity} units</span>
                   </div>
                 </div>
                 <div className="asset-financials">
                   <div className="price-info">
                     <span className="label">Avg Buy Price</span>
                     <span className="value">{formatCurrency(item.avgBuyPrice)}</span>
                   </div>
                   <div className="price-info highlight">
                     <span className="label">Total Value</span>
                     <span className="value total-value"><TrendingUp size={16} /> {formatCurrency(item.quantity * item.avgBuyPrice)}</span>
                   </div>
                 </div>
                 <button 
                   className="btn-main btn-outline" 
                   style={{ width: '100%', marginTop: 'auto', borderRadius: '8px' }}
                   onClick={() => navigate(`/coin/${item.asset.toLowerCase()}?symbol=${item.asset.toLowerCase()}usdt`)}
                 >
                   Trade
                 </button>
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
