import { useEffect, useState } from 'react';
import { CHAINS_LIST } from '../lib/chains';
import { SwapCard } from '../components/swap/SwapCard';

export default function TradePage() {
  const [prices, setPrices] = useState<Record<string, string>>({
    ETH: '—',
    SOL: '—',
    BNB: '—',
    USDT: '$1.00',
  });

  useEffect(() => {
    let mounted = true;
    const fetchMarketPrices = async () => {
      try {
        const [solRes, bnbRes, ethRes] = await Promise.allSettled([
          fetch('/api/bitfinex/v2/calc/fx', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ccy1: 'SOL', ccy2: 'USD' }),
          }).then(r => r.json()),
          fetch('/api/bitfinex/v2/calc/fx', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ccy1: 'BNB', ccy2: 'USD' }),
          }).then(r => r.json()),
          fetch('/api/bitfinex/v2/calc/fx', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ccy1: 'ETH', ccy2: 'USD' }),
          }).then(r => r.json()),
        ]);
        if (mounted) {
          const eth = ethRes.status === 'fulfilled' && Array.isArray(ethRes.value) ? ethRes.value[0] : 0;
          const sol = solRes.status === 'fulfilled' && Array.isArray(solRes.value) ? solRes.value[0] : 0;
          const bnb = bnbRes.status === 'fulfilled' && Array.isArray(bnbRes.value) ? bnbRes.value[0] : 0;
          setPrices({
            ETH: eth > 0 ? `$${eth.toFixed(2)}` : '—',
            SOL: sol > 0 ? `$${sol.toFixed(2)}` : '—',
            BNB: bnb > 0 ? `$${bnb.toFixed(2)}` : '—',
            USDT: '$1.00',
          });
        }
      } catch (err) {
        console.warn('Failed to fetch prices for TradePage:', err);
      }
    };
    fetchMarketPrices();
    const interval = setInterval(fetchMarketPrices, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '40px 24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

      {/* SWAP CARD */}
      <SwapCard />

      {/* SIDE PANEL */}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Live Rates */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            Live Rates
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { pair: 'ETH / USD', price: prices.ETH, color: '#627EEA' },
              { pair: 'SOL / USD', price: prices.SOL, color: '#9945FF' },
              { pair: 'BNB / USD', price: prices.BNB, color: '#F0B90B' },
              { pair: 'USDT / USD', price: prices.USDT, color: '#009393' },
            ].map(r => (
              <div key={r.pair} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{r.pair}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: r.color }}>{r.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it Works */}
        <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(0,147,147,0.08), rgba(108,92,231,0.05))' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>⚡ How it Works</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <p>1. You sign an intent to swap tokens.</p>
            <p>2. Our <strong style={{ color: 'var(--color-text)' }}>Intent Relayer</strong> detects your order.</p>
            <p>3. The Relayer <strong style={{ color: 'var(--color-primary-light)' }}>instantly fills</strong> on the destination chain.</p>
            <p>4. Atomic & Trustless. No bridges.</p>
          </div>
        </div>

        {/* Supported Chains */}
        <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-disabled)', whiteSpace: 'nowrap' }}>Chains:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {CHAINS_LIST.map(c => (
              <span key={c.id} style={{
                fontSize: 20, width: 32, height: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
              }} title={c.name}><img src={c.icon} alt={c.name} style={{ width: 16, height: 16, borderRadius: '50%' }} /></span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
