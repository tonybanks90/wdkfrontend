import { CHAINS_LIST } from '../lib/chains';
import { SwapCard } from '../components/swap/SwapCard';

export default function TradePage() {
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
              { pair: 'SOL / USD', price: '$148.50', color: '#9945FF' },
              { pair: 'BNB / USD', price: '$610.20', color: '#F0B90B' },
              { pair: 'USDT / USD', price: '$1.00', color: '#009393' },
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
            <p>2. Our <strong style={{ color: 'var(--color-text-primary)' }}>Intent Relayer</strong> detects your order.</p>
            <p>3. The Relayer <strong style={{ color: 'var(--color-accent-mint)' }}>instantly fills</strong> on the destination chain.</p>
            <p>4. Atomic & Trustless. No bridges.</p>
          </div>
        </div>

        {/* Supported Chains */}
        <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Chains:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {CHAINS_LIST.map(c => (
              <span key={c.id} style={{
                fontSize: 20, width: 32, height: 32, display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
              }} title={c.name}>{c.icon}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
