import { Wallet, Copy } from 'lucide-react';

const CHAIN_BALANCES = [
  {
    chain: 'Solana', icon: '◎', color: '#9945FF',
    address: 'Connect wallet to view',
    tokens: [
      { symbol: 'SOL', amount: '—', usd: '—' },
      { symbol: 'USDC', amount: '—', usd: '—' },
    ]
  },
  {
    chain: 'BNB Chain', icon: '⬡', color: '#F0B90B',
    address: 'Connect wallet to view',
    tokens: [
      { symbol: 'BNB', amount: '—', usd: '—' },
      { symbol: 'USDT', amount: '—', usd: '—' },
    ]
  },
];

export default function PortfolioPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 8 }}>
        <span className="gradient-text">Portfolio</span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 32 }}>
        View your multi-chain balances powered by WDK.
      </p>

      {/* Total Value */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Total Portfolio Value</div>
        <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          <span className="gradient-text">$—.——</span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
          fontSize: 11, color: 'var(--color-accent-teal)',
          background: 'rgba(0,147,147,0.1)', padding: '4px 10px', borderRadius: 6,
        }}>
          <Wallet size={10} /> Connect your WDK wallet to view balances
        </div>
      </div>

      {/* Chain Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {CHAIN_BALANCES.map(chain => (
          <div key={chain.chain} className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{chain.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{chain.chain}</span>
              </div>
              <button style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
              }}>
                <Copy size={12} /> Copy
              </button>
            </div>

            <div style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
              background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8, marginBottom: 16,
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {chain.address}
            </div>

            {chain.tokens.map(t => (
              <div key={t.symbol} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderTop: '1px solid var(--color-border)',
              }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.symbol}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>{t.amount}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.usd}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
