import { useState, useEffect, useCallback } from 'react';
import { Wallet, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import { useWDK } from '../providers/WDKProvider';
import { TOKENS } from '../lib/tokens';
import { ethers } from 'ethers';

/**
 * Token balance with USD value
 */
interface TokenBalance {
  symbol: string;
  name: string;
  icon: string;
  chainId: string;
  amount: string;  // human-readable
  rawAmount: bigint;
  usd: string;     // formatted USD value
  decimals: number;
}

/**
 * Fetch SOL/BNB prices from Bitfinex API (via Vite proxy to avoid CORS)
 */
async function fetchPrices(): Promise<Record<string, number>> {
  try {
    // Use Vite dev proxy: /api/bitfinex -> https://api-pub.bitfinex.com
    const [solRes, bnbRes] = await Promise.allSettled([
      fetch('/api/bitfinex/v2/calc/fx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ccy1: 'SOL', ccy2: 'USD' }),
      }).then(r => r.json()),
      fetch('/api/bitfinex/v2/calc/fx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ccy1: 'BNB', ccy2: 'USD' }),
      }).then(r => r.json()),
    ]);

    return {
      SOL: solRes.status === 'fulfilled' && Array.isArray(solRes.value) ? solRes.value[0] : 0,
      BNB: bnbRes.status === 'fulfilled' && Array.isArray(bnbRes.value) ? bnbRes.value[0] : 0,
      USDC: 1.0,
      USDT: 1.0,
    };
  } catch (e) {
    console.warn('[Portfolio] Price fetch failed:', e);
    return { SOL: 0, BNB: 0, USDC: 1.0, USDT: 1.0 };
  }
}

/**
 * Format balance from raw lamports/wei to human-readable
 */
function formatBalance(raw: bigint, decimals: number): string {
  if (raw === 0n) return '0';
  const str = raw.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, str.length - decimals) || '0';
  const frac = str.slice(str.length - decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac.slice(0, 6)}` : whole;
}

function shortenAddress(addr: string, chars = 6) {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export default function PortfolioPage() {
  const wdk = useWDK();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalUsd, setTotalUsd] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const copyAddress = (addr: string, field: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loadBalances = useCallback(async () => {
    if (!wdk.isInitialized) return;
    setIsLoading(true);

    try {
      const prices = await fetchPrices();
      const results: TokenBalance[] = [];

      // --- Solana balances via WDK solanaAccount ---
      if (wdk.solanaAccount) {
        // Native SOL
        try {
          const solBal: bigint = await wdk.solanaAccount.getBalance();
          const solToken = TOKENS.find(t => t.id === 'solana-sol')!;
          const amount = formatBalance(solBal, solToken.decimals);
          const usdVal = parseFloat(amount) * (prices.SOL || 0);
          results.push({
            symbol: solToken.symbol, name: solToken.name, icon: solToken.icon,
            chainId: 'solana', amount, rawAmount: solBal, decimals: solToken.decimals,
            usd: usdVal > 0 ? `$${usdVal.toFixed(2)}` : '$0.00',
          });
        } catch (e: any) {
          console.warn('[Portfolio] SOL balance fetch failed:', e.message);
          results.push({
            symbol: 'SOL', name: 'Solana', icon: '◎', chainId: 'solana',
            amount: '0', rawAmount: 0n, decimals: 9, usd: '$0.00',
          });
        }

        // SPL Token (USDC)
        const usdcToken = TOKENS.find(t => t.id === 'solana-usdc');
        if (usdcToken && usdcToken.address !== 'native') {
          try {
            const usdcBal: bigint = await wdk.solanaAccount.getTokenBalance(usdcToken.address);
            const amount = formatBalance(usdcBal, usdcToken.decimals);
            const usdVal = parseFloat(amount) * (prices.USDC || 1);
            results.push({
              symbol: usdcToken.symbol, name: usdcToken.name, icon: usdcToken.icon,
              chainId: 'solana', amount, rawAmount: usdcBal, decimals: usdcToken.decimals,
              usd: usdVal > 0 ? `$${usdVal.toFixed(2)}` : '$0.00',
            });
          } catch (e: any) {
            console.warn('[Portfolio] USDC balance fetch failed:', e.message);
            results.push({
              symbol: 'USDC', name: 'USD Coin', icon: '💲', chainId: 'solana',
              amount: '0', rawAmount: 0n, decimals: 6, usd: '$0.00',
            });
          }
        }
      }

      // --- BSC balances via ethers ---
      if (wdk.evmSigner && wdk.evmAddress) {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        
        // Native BNB
        try {
          const bnbBal = await provider.getBalance(wdk.evmAddress);
          const bnbToken = TOKENS.find(t => t.id === 'bsc-bnb')!;
          const amount = ethers.formatEther(bnbBal);
          const usdVal = parseFloat(amount) * (prices.BNB || 0);
          results.push({
            symbol: bnbToken.symbol, name: bnbToken.name, icon: bnbToken.icon,
            chainId: 'bsc', amount: parseFloat(amount).toFixed(6), rawAmount: bnbBal,
            decimals: bnbToken.decimals, usd: usdVal > 0 ? `$${usdVal.toFixed(2)}` : '$0.00',
          });
        } catch (e: any) {
          console.warn('[Portfolio] BNB balance fetch failed:', e.message);
          results.push({
            symbol: 'BNB', name: 'BNB', icon: '⬡', chainId: 'bsc',
            amount: '0', rawAmount: 0n, decimals: 18, usd: '$0.00',
          });
        }

        // ERC-20 USDT
        const usdtToken = TOKENS.find(t => t.id === 'bsc-usdt');
        if (usdtToken && usdtToken.address !== 'native') {
          try {
            const erc20 = new ethers.Contract(usdtToken.address, [
              'function balanceOf(address) view returns (uint256)',
              'function decimals() view returns (uint8)',
            ], provider);
            const bal: bigint = await erc20.balanceOf(wdk.evmAddress);
            const dec: number = await erc20.decimals();
            const amount = ethers.formatUnits(bal, dec);
            const usdVal = parseFloat(amount) * (prices.USDT || 1);
            results.push({
              symbol: usdtToken.symbol, name: usdtToken.name, icon: usdtToken.icon,
              chainId: 'bsc', amount: parseFloat(amount).toFixed(6), rawAmount: bal,
              decimals: dec, usd: usdVal > 0 ? `$${usdVal.toFixed(2)}` : '$0.00',
            });
          } catch (e: any) {
            console.warn('[Portfolio] USDT balance fetch failed:', e.message);
            results.push({
              symbol: 'USDT', name: 'Tether USD', icon: '₮', chainId: 'bsc',
              amount: '0', rawAmount: 0n, decimals: 18, usd: '$0.00',
            });
          }
        }
      }

      setBalances(results);
      const total = results.reduce((sum, b) => sum + parseFloat(b.usd.replace('$', '') || '0'), 0);
      setTotalUsd(total);
      setLastRefresh(new Date());
    } catch (e: any) {
      console.error('[Portfolio] Error loading balances:', e);
    } finally {
      setIsLoading(false);
    }
  }, [wdk.isInitialized, wdk.solanaAccount, wdk.evmSigner, wdk.evmAddress]);

  // Auto-fetch on mount and when wallet changes
  useEffect(() => {
    if (wdk.isInitialized) {
      loadBalances();
    }
  }, [wdk.isInitialized, loadBalances]);

  const solanaBalances = balances.filter(b => b.chainId === 'solana');
  const bscBalances = balances.filter(b => b.chainId === 'bsc');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
            <span className="gradient-text">Portfolio</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
            Multi-chain balances powered by WDK
          </p>
        </div>
        {wdk.isInitialized && (
          <button
            onClick={loadBalances}
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: 'rgba(0,147,147,0.1)', border: '1px solid rgba(0,147,147,0.2)',
              color: 'var(--color-accent-teal)', transition: 'all 0.2s',
            }}
          >
            {isLoading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Total Value */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Total Portfolio Value</div>
        <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          <span className="gradient-text">
            {wdk.isInitialized ? `$${totalUsd.toFixed(2)}` : '$—.——'}
          </span>
        </div>
        {!wdk.isInitialized ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
            fontSize: 11, color: 'var(--color-accent-teal)',
            background: 'rgba(0,147,147,0.1)', padding: '4px 10px', borderRadius: 6,
          }}>
            <Wallet size={10} /> Connect your WDK wallet to view balances
          </div>
        ) : lastRefresh && (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
            Last updated: {lastRefresh.toLocaleTimeString()} · Prices via Bitfinex
          </div>
        )}
      </div>

      {/* Chain Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {/* Solana Card */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>◎</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Solana</span>
              <span style={{ fontSize: 10, color: '#9945FF', background: 'rgba(153,69,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>Devnet</span>
            </div>
            {wdk.solanaAddress && (
              <button
                onClick={() => copyAddress(wdk.solanaAddress!, 'sol')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                }}
              >
                {copiedField === 'sol' ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                {copiedField === 'sol' ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>

          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
            background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8, marginBottom: 16,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {wdk.solanaAddress ? shortenAddress(wdk.solanaAddress, 8) : 'Connect wallet to view'}
          </div>

          {(solanaBalances.length > 0 ? solanaBalances : [
            { symbol: 'SOL', icon: '◎', amount: '—', usd: '—' },
            { symbol: 'USDC', icon: '💲', amount: '—', usd: '—' },
          ]).map((t: any) => (
            <div key={t.symbol} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderTop: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.symbol}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>{t.amount}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.usd}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BSC Card */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>⬡</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>BNB Chain</span>
              <span style={{ fontSize: 10, color: '#F0B90B', background: 'rgba(240,185,11,0.1)', padding: '2px 6px', borderRadius: 4 }}>Testnet</span>
            </div>
            {wdk.evmAddress && (
              <button
                onClick={() => copyAddress(wdk.evmAddress!, 'evm')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                }}
              >
                {copiedField === 'evm' ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                {copiedField === 'evm' ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>

          <div style={{
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
            background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8, marginBottom: 16,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {wdk.evmAddress ? shortenAddress(wdk.evmAddress, 8) : 'Connect wallet to view'}
          </div>

          {(bscBalances.length > 0 ? bscBalances : [
            { symbol: 'BNB', icon: '⬡', amount: '—', usd: '—' },
            { symbol: 'USDT', icon: '₮', amount: '—', usd: '—' },
          ]).map((t: any) => (
            <div key={t.symbol} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderTop: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t.symbol}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>{t.amount}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.usd}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Powered by */}
      <div style={{
        textAlign: 'center', marginTop: 24, fontSize: 11,
        color: 'var(--color-text-muted)',
      }}>
        Balances via <span style={{ color: 'var(--color-accent-teal)' }}>Tether WDK</span> · Prices via <span style={{ color: 'var(--color-accent-teal)' }}>Bitfinex</span>
      </div>
    </div>
  );
}
