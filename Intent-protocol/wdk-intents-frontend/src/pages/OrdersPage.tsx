import { Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const MOCK_ORDERS = [
  { id: 'sol_bsc_001', direction: 'SOL → BSC', from: '0.01 USDC', to: '0.01 USDT', status: 'COMPLETED', time: '2 min ago' },
  { id: 'sol_bsc_002', direction: 'BSC → SOL', from: '0.05 USDT', to: '0.05 USDC', status: 'DEST_CLAIMED', time: '5 min ago' },
  { id: 'sol_bsc_003', direction: 'SOL → BSC', from: '1.00 USDC', to: '1.00 USDT', status: 'PENDING', time: '8 min ago' },
  { id: 'sol_bsc_004', direction: 'SOL → BSC', from: '0.10 USDC', to: '0.10 USDT', status: 'FAILED', time: '1h ago' },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    COMPLETED: { color: '#00C9A7', bg: 'rgba(0,201,167,0.12)', icon: <CheckCircle size={12} /> },
    DEST_CLAIMED: { color: '#4E7BEE', bg: 'rgba(78,123,238,0.12)', icon: <Clock size={12} /> },
    PENDING: { color: '#FFB347', bg: 'rgba(255,179,71,0.12)', icon: <Clock size={12} /> },
    FAILED: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', icon: <XCircle size={12} /> },
    SOURCE_LOCKED: { color: '#6C5CE7', bg: 'rgba(108,92,231,0.12)', icon: <Clock size={12} /> },
  };
  const c = config[status] || config.PENDING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, color: c.color,
      background: c.bg, padding: '4px 10px', borderRadius: 8,
    }}>
      {c.icon} {status.replace('_', ' ')}
    </span>
  );
}

export default function OrdersPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 8 }}>
        Your <span className="gradient-text">Orders</span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 32 }}>
        Track your cross-chain swap history and active orders.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MOCK_ORDERS.map(order => (
          <div key={order.id} className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{order.direction}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{order.id}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{order.from}</span>
              <ArrowRight size={14} color="var(--color-text-muted)" />
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-accent-mint)' }}>{order.to}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StatusBadge status={order.status} />
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{order.time}</span>
            </div>
          </div>
        ))}
      </div>

      {MOCK_ORDERS.length === 0 && (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No orders yet. Start by making a swap on the Trade page.
        </div>
      )}
    </div>
  );
}
