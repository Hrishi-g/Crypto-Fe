import React, { useState } from 'react';

interface CryptoIconProps {
  symbol: string;
  size?: number;
}

const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, size = 32 }) => {
  const [error, setError] = useState(false);
  
  if (error) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', background: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, color: '#bd34fe', fontSize: size * 0.4, textTransform: 'uppercase',
        flexShrink: 0
      }}>
        {symbol.substring(0, 3)}
      </div>
    );
  }
  
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <img 
        src={`https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`} 
        alt={symbol}
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
        onError={() => setError(true)}
      />
    </div>
  );
};

export default CryptoIcon;
