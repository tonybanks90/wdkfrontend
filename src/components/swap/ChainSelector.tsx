import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { CHAINS_LIST } from '../../lib/chains';
import type { Chain } from '../../lib/chains';
import { createPortal } from 'react-dom';

interface ChainSelectorProps {
  selectedChain: Chain;
  onSelect: (chain: Chain) => void;
  disabledChains?: string[];
}

export function ChainSelector({ selectedChain, onSelect, disabledChains = [] }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Position the dropdown below the button
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'absolute',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width > 160 ? rect.width : 160,
        zIndex: 50
      });
    }
  }, [isOpen]);

  const dropdownContent = (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsOpen(false)} />
      <div className="glass-card" style={{
        ...dropdownStyle,
        padding: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        {CHAINS_LIST.map(c => {
          const isDisabled = disabledChains.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => {
                if (!isDisabled) {
                  onSelect(c);
                  setIsOpen(false);
                }
              }}
              disabled={isDisabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 12px', border: 'none', borderRadius: 8,
                background: c.id === selectedChain.id ? 'rgba(0,147,147,0.15)' : 'transparent',
                color: isDisabled ? 'var(--color-text-disabled)' : 'var(--color-text)',
                cursor: isDisabled ? 'not-allowed' : 'pointer', fontSize: 14,
                opacity: isDisabled ? 0.5 : 1
              }}
            >
              <img src={c.icon} alt={c.symbol} style={{ width: 18, height: 18, borderRadius: '50%' }} />
              {c.name}
              {c.id === selectedChain.id && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary-light)' }} />}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      <button 
        ref={buttonRef}
        className="chain-selector" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
          borderRadius: 12, color: 'var(--color-text)', cursor: 'pointer',
          fontSize: 14, fontWeight: 600
        }}
      >
        <img src={selectedChain.icon} alt={selectedChain.symbol} style={{ width: 16, height: 16, borderRadius: '50%' }} />
        <span>{selectedChain.symbol}</span>
        <ChevronDown size={14} color="var(--color-text-disabled)" />
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}
