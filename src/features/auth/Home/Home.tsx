import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { apiFetch } from '../../../utils/api';
import './Home.css';

interface BinanceTicker {
  symbol: string;
  name: string;
  image: string;
  quoteVolume: number;
  lastPrice: string;
  priceChangePercent: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useOutletContext<{ user: any }>();
  const [cryptoData, setCryptoData] = useState<BinanceTicker[]>([]);
  const [inrRate, setInrRate] = useState<number>(92.50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/home/crypto/exchange-rate`);
        if (res.ok) {
          const rate = await res.json();
          setInrRate(rate);
        }
      } catch (err) {
        // Failed to fetch exchange rate silently
      }
    };
    fetchRate();

    const fetchTopCrypto = async () => {
      try {
        const response = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/home/crypto/top-crypto`);
        if (response.ok) {
          const data = await response.json();
          setCryptoData(data);
        }
      } catch (error) {
        // Error fetching crypto data silently
      } finally {
        setLoading(false);
      }
    };

    fetchTopCrypto();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value * inrRate); // Multiply Binance's USDT price by live exchange rate
  };


  return (
    <div className="home-wrapper">
      {/* Hero Section */}
      <section className="hero-container">
        <div className="hero-left">
          <div className="badge">Trade Crypto in INR</div>
          <h1 className="hero-title">
            Trade the Future <span>of Digital Assets</span>
          </h1>
          <p className="hero-desc">
            Experience the world's most advanced crypto trading platform. 
            Secure, lighting-fast, and built for both beginners and pro traders.
          </p>
          <div className="hero-cta">
            <button className="btn-main btn-primary-gradient" onClick={() => {
              if (user) {
                const marketSection = document.getElementById('market');
                if (marketSection) {
                  marketSection.scrollIntoView({ behavior: 'smooth' });
                }
              } else {
                navigate('/login');
              }
            }}>
              Start Trading Now
            </button>
            <button className="btn-main btn-outline" onClick={() => navigate('/markets')}>
              View Markets
            </button>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-img-box">
             <img src="/crypto_hero_visual_1773468378337.webp" alt="Crypto Visual" className="hero-img" />
          </div>
        </div>
      </section>

      {/* Ticker Section */}
      <div className="market-ticker">
        <div className="ticker-content">
          {cryptoData.length > 0 && [...cryptoData, ...cryptoData].map((coin, idx) => {

            const price = parseFloat(coin.lastPrice);
            const change = parseFloat(coin.priceChangePercent);
            return (
              <div 
                key={idx} 
                className="ticker-item clickable" 
                onClick={() => navigate(`/coin/symbol=${coin.symbol.toLowerCase()}&name=${encodeURIComponent(coin.name)}`)}
              >
                <span className="symbol">{coin.name}</span>
                <span className="price">{formatCurrency(price)}</span>
                <span className={`change ${change >= 0 ? 'up' : 'down'}`}>
                  {change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Market Section */}
      <section id="market" className="market-section">
        <div className="section-header">
          <h2 className="section-title">Market Overview</h2>
          <p className="hero-desc1">Track real-time performance of top crypto assets.</p>
        </div>
        
        {loading ? (
          <div className="loader-container">
            <div className="crypto-loader">
              <div className="loader-circle"></div>
              <div className="loader-coin">₿</div>
            </div>
            <div className="loader-text">SYNCING MARKET DATA...</div>
          </div>
        ) : (
          <div className="market-grid">
            {cryptoData.map((coin) => {
              const baseSymbol = coin.symbol.replace(/USDT$/, '').replace(/USD$/, '');
              const price = parseFloat(coin.lastPrice);
              const change = parseFloat(coin.priceChangePercent);
              const imgUrl = coin.image;
              return (
              <div key={coin.symbol} className="coin-card">
                <div className="coin-info">
                  {imgUrl ? (
                    <img src={imgUrl} alt={coin.name} className="coin-icon" style={{objectFit: 'contain', width: '40px', height: '40px'}} 
                         onError={(e) => {
                           // If coincap also fails to find the coin, gracefully replace with a generic letter icon
                           (e.target as HTMLElement).style.display = 'none';
                           (e.target as HTMLElement).nextElementSibling!.classList.remove('hidden-fallback');
                         }}
                    />
                  ) : null}
                  <div className={`coin-icon ${imgUrl ? 'hidden-fallback' : ''}`} style={{display: imgUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', color: '#fff', borderRadius: '50%', fontWeight: 'bold', fontSize: '10px'}}>
                    {baseSymbol.substring(0, 3)}
                  </div>
                  <div>
                    <div style={{fontWeight: 700}}>{coin.name}</div>
                    <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>{baseSymbol}</div>
                  </div>
                </div>
                <div className="coin-price">{formatCurrency(price)}</div>
                <div className={`change ${change >= 0 ? 'up' : 'down'}`} style={{fontWeight: 600}}>
                  {change.toFixed(2)}% (24h)
                </div>
                <button 
                  className="btn-main btn-outline" 
                  style={{width: '100%', marginTop: '1.5rem', borderRadius: '8px'}}
                  onClick={() => navigate(`/coin/${baseSymbol.toLowerCase()}?symbol=${coin.symbol.toLowerCase()}&name=${encodeURIComponent(coin.name)}`)}
                >
                  Trade Now
                </button>
              </div>
            )})}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section id="features" className="market-section" style={{background: 'var(--bg-surface)'}}>
        <div className="section-header">
          <h2 className="section-title">Why Cryptx?</h2>
        </div>
        <div className="market-grid">
          <div className="coin-card">
            <h3>Military-Grade Security</h3>
            <p className="hero-desc">Your assets are protected by multiple layers of encryption and offline cold storage.</p>
          </div>
          <div className="coin-card">
            <h3>Ultra-Fast Execution</h3>
            <p className="hero-desc">Our matching engine handles over 100,000 transactions per second with sub-millisecond latency.</p>
          </div>
          <div className="coin-card">
            <h3>Deep Liquidity</h3>
            <p className="hero-desc">Access deep liquidity pools across major global exchanges for the best trading prices.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{padding: '4rem 5%', borderTop: '1px solid var(--border)', textAlign: 'center'}}>
        <div className="logo" style={{marginBottom: '1.5rem'}}>CRYPTX</div>
        <p style={{color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem'}}>
          The next generation of crypto trading is here. Join millions of users and start building your portfolio today.
        </p>
        {/* <div className="nav-links" style={{justifyContent: 'center', marginBottom: '2rem', display: 'flex'}}>
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
          <a href="#">Support</a>
          <a href="#">API</a>
        </div> */}
        <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>
          © 2024 Cryptx Trading Ltd. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;