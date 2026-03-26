import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useWDK } from '../providers/WDKProvider';
import { RelayerAPI } from '../lib/api';
import { TOKENS } from '../lib/tokens';

function getTokenSymbolAndIcon(chainLabel: string, tokenAddr: string) {
  if (!chainLabel || !tokenAddr) return { symbol: 'TOKEN', icon: '' };
  const chain = chainLabel === 'SOL' ? 'solana' : chainLabel === 'BSC' ? 'bsc' : chainLabel === 'ETH' ? 'ethereum' : chainLabel.toLowerCase();
  
  if (tokenAddr === 'native') {
    const t = TOKENS.find(tk => tk.chainId === chain && tk.address === 'native');
    if (t) return { symbol: t.symbol, icon: t.icon };
    if (chain === 'solana') return { symbol: 'SOL', icon: '/logos/solana.svg' };
    if (chain === 'bsc') return { symbol: 'BNB', icon: '/logos/bnb-bnb-logo.svg' };
    if (chain === 'ethereum') return { symbol: 'ETH', icon: '/logos/ethereum-eth-logo.svg' };
    return { symbol: 'NATIVE', icon: '' };
  } else {
    const t = TOKENS.find(tk => tk.chainId === chain && (tk.address.toLowerCase() === tokenAddr.toLowerCase() || tk.address === tokenAddr));
    if (t) return { symbol: t.symbol, icon: t.icon };
    return { symbol: 'TOKEN', icon: '' };
  }
}

// Helper to format large amounts since they are stored as raw strings
function formatAmountStr(rawStr: string, chainId?: string): string {
  if (!rawStr) return '0.00';
  try {
    const num = Number(rawStr);
    const isSolana = chainId === 'SOL' || chainId === 'SOLANA';
    
    // Solana Native SOL is typically 9 decimals.
    if (isSolana && num > 1e7) {
      if (num > 1e16) return (num / 1e18).toFixed(4); // fallback
      return (num / 1e9).toFixed(4); // 9 decimals
    }

    if (num > 1e16) return (num / 1e18).toFixed(4); // 18 decimals
    if (num > 1e4) return (num / 1e6).toFixed(2);  // 6 decimals
    return num.toString();
  } catch {
    return rawStr;
  }
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    COMPLETED: { color: '#00C9A7', bg: 'rgba(0,201,167,0.12)', icon: <CheckCircle size={12} /> },
    DEST_CLAIMED: { color: '#4E7BEE', bg: 'rgba(78,123,238,0.12)', icon: <Clock size={12} /> },
    DEST_FILLED: { color: '#FF00FF', bg: 'rgba(255,0,255,0.12)', icon: <CheckCircle size={12} /> },
    PENDING: { color: '#FFB347', bg: 'rgba(255,179,71,0.12)', icon: <Clock size={12} /> },
    FAILED: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', icon: <XCircle size={12} /> },
    SOURCE_LOCKED: { color: '#6C5CE7', bg: 'rgba(108,92,231,0.12)', icon: <Clock size={12} /> },
  };
  const c = config[status] || config.PENDING;
  const label = status === 'DEST_FILLED' ? 'READY TO CLAIM' : status.replace('_', ' ');
  
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, color: c.color,
      background: c.bg, padding: '4px 10px', borderRadius: 8,
    }}>
      {c.icon} {label}
    </span>
  );
}

export default function OrdersPage() {
  const wdk = useWDK();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchOrders = async () => {
      try {
        const data = await RelayerAPI.getOrders();
        if (!mounted) return;
        
        // Map actual API payload keys to UI expected format
        let allOrders: any[] = [
          ...(Array.isArray(data?.active) ? data.active : []),
          ...(Array.isArray(data?.completed) ? data.completed : []),
        ].map(o => {
          let sourceChain = 'SRC';
          let destChain = 'DST';
          if (o.direction) {
            const parts = o.direction.split('_TO_');
            if (parts.length === 2) {
              sourceChain = parts[0];
              destChain = parts[1];
            }
          }
          return {
            ...o,
            maker: o.makerAddress || o.maker,
            recipient: o.recipientAddress || o.recipient,
            amountIn: o.sellAmount || o.amountIn,
            amountOut: o.buyAmount || o.amountOut,
            sourceChain,
            destChain
          };
        });

        // Filter for this user
        if (wdk.evmAddress || wdk.solanaAddress) {
          const evmLower = wdk.evmAddress?.toLowerCase();
          const solLower = wdk.solanaAddress?.toLowerCase();
          
          allOrders = allOrders.filter((o: any) => {
            const maker = o.maker?.toLowerCase();
            const recip = o.recipient?.toLowerCase();
            return maker === evmLower || maker === solLower || recip === evmLower || recip === solLower;
          });
        }
        
        allOrders.sort((a: any, b: any) => {
          if (a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
          return (a.id || '') > (b.id || '') ? -1 : 1; 
        });

        setOrders(allOrders);
      } catch (e) {
        console.warn('Failed to fetch orders:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [wdk.evmAddress, wdk.solanaAddress]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 8 }}>
        Your <span className="gradient-text">Orders</span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 32 }}>
        Track your cross-chain swap history and active orders.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading && orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-disabled)' }}>
            <Loader2 size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            Loading orders from relayer...
          </div>
        ) : orders.map(order => {
          const dirStr = `${(order.sourceChain || 'SRC').toUpperCase()} → ${(order.destChain || 'DST').toUpperCase()}`;
          return (
            <div key={order.id} className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{dirStr}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-disabled)', fontFamily: 'var(--font-mono)' }}>
                    {order.id.slice(0, 16)}...
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {formatAmountStr(order.amountIn, order.sourceChain)}
                  {(() => {
                    const srcInfo = getTokenSymbolAndIcon(order.sourceChain || 'SRC', order.sourceToken);
                    return srcInfo.icon ? <img src={srcInfo.icon} alt={srcInfo.symbol} style={{ width: 14, height: 14, borderRadius: '50%' }} title={srcInfo.symbol} /> : <span>{srcInfo.symbol}</span>;
                  })()}
                </span>
                <ArrowRight size={14} color="var(--color-text-disabled)" />
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {formatAmountStr(order.amountOut, order.destChain)}
                  {(() => {
                    const destInfo = getTokenSymbolAndIcon(order.destChain || 'DST', order.destToken);
                    return destInfo.icon ? <img src={destInfo.icon} alt={destInfo.symbol} style={{ width: 14, height: 14, borderRadius: '50%' }} title={destInfo.symbol} /> : <span>{destInfo.symbol}</span>;
                  })()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StatusBadge status={order.status} />
                {order.status === 'DEST_FILLED' && (
                  <button
                    onClick={async () => {
                      const secret = localStorage.getItem(`secret_${order.hashlock}`);
                      if (!secret) return alert('Secret not found in browser local storage. Cannot claim automatically.');
                      try {
                        const btn = document.getElementById(`claim-btn-${order.id}`);
                        if (btn) btn.innerText = 'Claiming...';
                        await RelayerAPI.claimSwap(order.id, secret);
                        alert('Escrow Claimed Successfully! Funds have been released.');
                        window.location.reload();
                      } catch (e: any) {
                        alert(e.message || 'Claim failed');
                      }
                    }}
                    id={`claim-btn-${order.id}`}
                    style={{
                      background: 'var(--color-primary)', border: 'none', color: '#000',
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'opacity 0.2s'
                    }}
                  >
                    Claim
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && orders.length === 0 && (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-disabled)' }}>
          No orders yet. Start by making a swap on the Trade page.
        </div>
      )}
    </div>
  );
}
