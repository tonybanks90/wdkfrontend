import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWDK } from '../../providers/WDKProvider';
import { KeyRound, Plus, Download, Eye, EyeOff, Lock, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';

type Step = 'choose' | 'create-show' | 'create-password' | 'import' | 'unlock';

export function WalletOnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wdk = useWDK();
  const [step, setStep] = useState<Step>(wdk.hasStoredWallet ? 'unlock' : 'choose');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [importPhrase, setImportPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const phrase = await wdk.createWallet();
      setSeedPhrase(phrase);
      setStep('create-show');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await wdk.saveWallet(password);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const words = importPhrase.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError('Enter a valid 12 or 24 word seed phrase');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await wdk.importWallet(importPhrase);
      setStep('create-password');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!password) {
      setError('Enter your password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await wdk.unlockWallet(password);
      if (success) {
        onClose();
      } else {
        setError('Wrong password');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copySeed = () => {
    navigator.clipboard.writeText(seedPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      }} onClick={onClose} />
      {/* Modal Card — absolute center */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 101, width: '100%', maxWidth: 440, padding: 32,
        background: 'var(--color-surface, rgba(15, 23, 42, 0.95))',
        border: '1px solid var(--color-border, rgba(0,147,147,0.2))',
        borderRadius: 20, boxShadow: 'var(--shadow-lg, 0 24px 80px rgba(0,0,0,0.6))',
        animation: 'fadeIn 0.2s ease-out', maxHeight: '90vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        {/* STEP: Choose */}
        {step === 'choose' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, var(--color-accent-teal), var(--color-accent-mint))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <KeyRound size={28} color="#fff" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
                WDK Wallet
              </h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                One seed phrase. All chains. Self-custodial.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-gradient" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleCreate} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create New Wallet
              </button>
              <button style={{
                width: '100%', padding: '14px 0', borderRadius: 14, fontSize: 14, fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }} onClick={() => setStep('import')}>
                <Download size={16} /> Import Seed Phrase
              </button>
            </div>
          </>
        )}

        {/* STEP: Show Seed Phrase */}
        {step === 'create-show' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, fontFamily: 'var(--font-heading)' }}>
              Your Seed Phrase
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <AlertTriangle size={14} /> Write this down and store it safely. Never share it.
            </p>

            <div style={{
              position: 'relative', borderRadius: 14, padding: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
              marginBottom: 16,
            }}>
              {!showSeed && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 14,
                  background: 'rgba(10,10,20,0.9)', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 2,
                }} onClick={() => setShowSeed(true)}>
                  <EyeOff size={20} color="var(--color-text-muted)" />
                  <span style={{ marginLeft: 8, color: 'var(--color-text-muted)', fontSize: 13 }}>Click to reveal</span>
                </div>
              )}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
              }}>
                {seedPhrase.split(' ').map((word, i) => (
                  <div key={i} style={{
                    fontSize: 12, fontFamily: 'var(--font-mono)', padding: '6px 8px',
                    background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                    color: 'var(--color-text-primary)',
                  }}>
                    <span style={{ color: 'var(--color-text-muted)', marginRight: 4 }}>{i + 1}.</span>
                    {word}
                  </div>
                ))}
              </div>
            </div>

            <button style={{
              width: '100%', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12,
            }} onClick={copySeed}>
              {copied ? <><Check size={14} color="var(--color-success)" /> Copied!</> : <><Copy size={14} /> Copy Seed Phrase</>}
            </button>

            <button className="btn-gradient" style={{ width: '100%' }}
              onClick={() => setStep('create-password')}>
              I've Saved It — Continue
            </button>
          </>
        )}

        {/* STEP: Set Password (for encrypted localStorage) */}
        {step === 'create-password' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Lock size={32} color="var(--color-accent-teal)" style={{ marginBottom: 12 }} />
              <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
                Set a Password
              </h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Your wallet will be encrypted and saved locally. Use this password to unlock next time.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)', outline: 'none',
                }}
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)', outline: 'none',
                }}
                onKeyDown={e => e.key === 'Enter' && handleSavePassword()}
              />
            </div>

            {error && (
              <p style={{ fontSize: 12, color: 'var(--color-error)', marginBottom: 10 }}>{error}</p>
            )}

            <button className="btn-gradient" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleSavePassword} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Encrypt & Save
            </button>
          </>
        )}

        {/* STEP: Import */}
        {step === 'import' && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, fontFamily: 'var(--font-heading)' }}>
              Import Wallet
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Paste your 12 or 24 word seed phrase below.
            </p>

            <textarea
              placeholder="word1 word2 word3 ..."
              value={importPhrase}
              onChange={e => setImportPhrase(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', outline: 'none', resize: 'none',
                fontFamily: 'var(--font-mono)', marginBottom: 12,
              }}
            />

            {error && (
              <p style={{ fontSize: 12, color: 'var(--color-error)', marginBottom: 10 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', cursor: 'pointer',
              }} onClick={() => { setStep('choose'); setError(''); }}>
                Back
              </button>
              <button className="btn-gradient" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleImport} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Import
              </button>
            </div>
          </>
        )}

        {/* STEP: Unlock */}
        {step === 'unlock' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Lock size={32} color="var(--color-accent-teal)" style={{ marginBottom: 12 }} />
              <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
                Welcome Back
              </h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Enter your password to unlock your wallet.
              </p>
            </div>

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 14,
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', outline: 'none', marginBottom: 12,
              }}
              autoFocus
            />

            {error && (
              <p style={{ fontSize: 12, color: 'var(--color-error)', marginBottom: 10 }}>{error}</p>
            )}

            <button className="btn-gradient" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}
              onClick={handleUnlock} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Unlock
            </button>

            <button style={{
              width: '100%', padding: '10px', borderRadius: 10, fontSize: 12,
              background: 'transparent', border: 'none', color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }} onClick={() => { setStep('choose'); setError(''); }}>
              Use a different wallet
            </button>
          </>
        )}
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
