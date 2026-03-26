import { useState, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { TOKENS } from '../../lib/tokens';
import type { Token } from '../../lib/tokens';
import { createPortal } from 'react-dom';

interface TokenSelectorProps {
  selectedToken: Token;
  onSelect: (token: Token) => void;
}

export function TokenSelector({ selectedToken, onSelect }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const tokens = TOKENS.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const chainBadge = (chain: string) => {
    switch (chain) {
        case 'bsc': return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 12, background: 'rgba(240,185,11,0.15)', color: '#F0B90B' }}>BNB</span>;
        case 'solana': return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 12, background: 'rgba(153,69,255,0.15)', color: '#9945FF' }}>SOL</span>;
        case 'ethereum': return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 12, background: 'rgba(98,126,234,0.15)', color: '#627EEA' }}>ETH</span>;
        default: return null;
    }
  };

  const modalContent = (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }} onClick={() => setIsOpen(false)} />
      
      <div className="glass-card" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 101, width: '100%', maxWidth: 400, padding: 24,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 20, boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Select a token</h3>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-disabled)', cursor: 'pointer', fontSize: 24 }}>&times;</button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
          borderRadius: 12, marginBottom: 20
        }}>
          <Search size={16} color="var(--color-text-disabled)" />
          <input 
            type="text" 
            placeholder="Search name or symbol" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--color-text)',
              fontSize: 14, width: '100%', outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
          {['solana', 'bsc', 'ethereum'].map(chainGrp => {
            const chainTokens = tokens.filter(t => t.chainId === chainGrp);
            if (chainTokens.length === 0) return null;
            
            const groupName = chainGrp === 'solana' ? 'Solana (Devnet)' : chainGrp === 'bsc' ? 'BNB Chain (Testnet)' : 'Ethereum Sepolia';
            return (
              <div key={chainGrp}>
                <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {groupName}
                </div>
                {chainTokens.map(token => (
                  <button
                    key={token.id}
                    onClick={() => {
                      onSelect(token);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                      background: token.id === selectedToken.id ? 'rgba(0,147,147,0.15)' : 'transparent',
                      border: 'none', borderRadius: 12, cursor: 'pointer', width: '100%',
                      transition: 'background 0.2s', textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = token.id === selectedToken.id ? 'rgba(0,147,147,0.15)' : 'transparent'}
                  >
                    <img src={token.icon} alt={token.symbol} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'contain' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{token.symbol}</span>
                        {chainBadge(token.chainId)}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-text-disabled)' }}>{token.name}</span>
                    </div>
                    {token.id === selectedToken.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary-light)' }} />}
                  </button>
                ))}
              </div>
            );
          })}
          {tokens.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-disabled)', fontSize: 14 }}>
              No tokens found for this network.
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button 
        ref={buttonRef}
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          background: 'rgba(0,147,147,0.15)', border: '1px solid rgba(0,147,147,0.3)',
          borderRadius: 20, color: 'var(--color-text)', cursor: 'pointer',
          fontSize: 16, fontWeight: 700, minWidth: 100, justifyContent: 'space-between'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <img src={selectedToken?.icon || '/logos/solana.svg'} alt={selectedToken?.symbol} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'contain' }} />
          {selectedToken?.symbol || 'Select'}
        </span>
        <ChevronDown size={14} />
      </button>
      
      {isOpen && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
}
