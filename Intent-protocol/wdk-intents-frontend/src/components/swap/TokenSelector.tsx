import { useState, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { getTokensForChain } from '../../lib/tokens';
import type { Token } from '../../lib/tokens';
import { createPortal } from 'react-dom';

interface TokenSelectorProps {
  selectedToken: Token;
  chainId: string;
  onSelect: (token: Token) => void;
}

export function TokenSelector({ selectedToken, chainId, onSelect }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const tokens = getTokensForChain(chainId);

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
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 24 }}>&times;</button>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
          borderRadius: 12, marginBottom: 20
        }}>
          <Search size={16} color="var(--color-text-muted)" />
          <input 
            type="text" 
            placeholder="Search name or paste address" 
            style={{
              background: 'transparent', border: 'none', color: 'var(--color-text-primary)',
              fontSize: 14, width: '100%', outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
          {tokens.map(token => (
            <button
              key={token.id}
              onClick={() => {
                onSelect(token);
                setIsOpen(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                background: token.id === selectedToken.id ? 'rgba(0,147,147,0.1)' : 'transparent',
                border: 'none', borderRadius: 12, cursor: 'pointer', width: '100%',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = token.id === selectedToken.id ? 'rgba(0,147,147,0.1)' : 'transparent'}
            >
              <span style={{ fontSize: 24 }}>{token.icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>{token.symbol}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{token.name}</span>
              </div>
            </button>
          ))}
          {tokens.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
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
          borderRadius: 20, color: 'var(--color-text-primary)', cursor: 'pointer',
          fontSize: 16, fontWeight: 700, minWidth: 100, justifyContent: 'space-between'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{selectedToken?.icon || '?' }</span>
          {selectedToken?.symbol || 'Select'}
        </span>
        <ChevronDown size={14} />
      </button>
      
      {isOpen && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
}
