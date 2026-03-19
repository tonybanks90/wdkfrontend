import { useState } from 'react';
import { useWDK } from '../../providers/WDKProvider';
import { Wallet, ChevronDown, LogOut, Copy, Check, Eye, EyeOff, KeyRound } from 'lucide-react';
import { WalletOnboardingModal } from './WalletOnboardingModal';

function shortenAddress(addr: string, chars = 5) {
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

export function ConnectWalletButton() {
  const wdk = useWDK();
  const [showModal, setShowModal] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSeed, setShowSeed] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Always render the modal — it manages its own open/close state
  // This prevents it from being unmounted mid-flow when isInitialized changes
  return (
    <>
      {/* Onboarding Modal — always mounted, controlled by showModal */}
      <WalletOnboardingModal open={showModal} onClose={() => setShowModal(false)} />

      {!wdk.isInitialized ? (
        <button
          className="btn-gradient"
          style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setShowModal(true)}
        >
          <Wallet size={16} />
          Connect Wallet
        </button>
      ) : (
        <div style={{ position: 'relative' }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 12,
              background: 'rgba(0,147,147,0.15)', border: '1px solid rgba(0,147,147,0.3)',
              color: 'var(--color-accent-mint)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
            onClick={() => setShowPopover(!showPopover)}
          >
            <div style={{ display: 'flex', gap: 2 }}>
              {wdk.evmAddress && <span style={{ fontSize: 14 }}>⬡</span>}
              {wdk.solanaAddress && <span style={{ fontSize: 14 }}>◎</span>}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {wdk.evmAddress ? shortenAddress(wdk.evmAddress) : 'Connected'}
            </span>
            <ChevronDown size={14} />
          </button>

          {/* Wallet Details Popover */}
          {showPopover && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => { setShowPopover(false); setShowSeed(false); }} />
              <div className="glass-card" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                width: 340, padding: 20, zIndex: 50,
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Connected Wallets</div>

                {/* BSC Address */}
                {wdk.evmAddress && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>⬡</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#F0B90B' }}>BNB Chain (Testnet)</span>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {wdk.evmAddress}
                      </span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}
                        onClick={() => copyToClipboard(wdk.evmAddress!, 'evm')}>
                        {copiedField === 'evm' ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Solana Address */}
                {wdk.solanaAddress && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>◎</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#9945FF' }}>Solana (Devnet)</span>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {wdk.solanaAddress}
                      </span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}
                        onClick={() => copyToClipboard(wdk.solanaAddress!, 'sol')}>
                        {copiedField === 'sol' ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Seed Phrase Export */}
                {wdk.seedPhrase && (
                  <div style={{ marginBottom: 14 }}>
                    <button style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
                      color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: 6,
                    }} onClick={() => setShowSeed(!showSeed)}>
                      {showSeed ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showSeed ? 'Hide' : 'Reveal'} Seed Phrase
                    </button>

                    {showSeed && (
                      <div style={{
                        marginTop: 8, padding: 10, borderRadius: 8,
                        background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)',
                      }}>
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
                          marginBottom: 8,
                        }}>
                          {wdk.seedPhrase.split(' ').map((word, i) => (
                            <span key={i} style={{
                              fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 4px',
                              background: 'rgba(255,255,255,0.04)', borderRadius: 4,
                              color: 'var(--color-text-primary)',
                            }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>{i + 1}.</span> {word}
                            </span>
                          ))}
                        </div>
                        <button style={{
                          width: '100%', padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', gap: 4,
                        }} onClick={() => copyToClipboard(wdk.seedPhrase!, 'seed')}>
                          {copiedField === 'seed' ? <><Check size={10} color="var(--color-success)" /> Copied!</> : <><Copy size={10} /> Copy</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* WDK badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                  color: 'var(--color-accent-teal)', marginBottom: 12,
                  padding: '6px 10px', borderRadius: 8, background: 'rgba(0,147,147,0.08)',
                }}>
                  <KeyRound size={12} /> Powered by Tether WDK — Self-Custodial
                </div>

                {/* Disconnect */}
                <button style={{
                  width: '100%', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)',
                  color: 'var(--color-error)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }} onClick={() => { wdk.disconnect(); setShowPopover(false); setShowSeed(false); }}>
                  <LogOut size={14} /> Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
