import { NavLink } from 'react-router-dom';
import { Zap, Shield, Clock, ArrowRight, Layers } from 'lucide-react';

const CHAINS = [
  { name: 'Solana', color: '#9945FF', icon: '/logos/solana.svg' },
  { name: 'Ethereum', color: '#627EEA', icon: '/logos/ethereum-eth-logo.svg' },
  { name: 'BNB Chain', color: '#F0B90B', icon: '/logos/bnb-bnb-logo.svg' },
  { name: 'Bitcoin Cash', color: '#0AC18E', icon: '/logos/bitcoin-cash-bch-logo.svg' },
];

const FEATURES = [
  { icon: <Zap size={24} />, title: 'Instant Swaps', desc: 'Intent-based architecture delivers immediate fills via automated relayers.' },
  { icon: <Shield size={24} />, title: 'Self-Custodial', desc: 'Your keys, your crypto. WDK wallets run entirely in your browser.' },
  { icon: <Clock size={24} />, title: 'Atomic Settlement', desc: 'HTLC hash-locks guarantee both sides settle — or both refund.' },
  { icon: <Layers size={24} />, title: 'Multi-Chain', desc: 'One seed phrase gives you wallets on Solana, Ethereum, BSC, and Bitcoin Cash.' },
];

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '80px 0 60px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,147,147,0.1)', border: '1px solid rgba(0,147,147,0.2)',
          borderRadius: 50, padding: '6px 16px', fontSize: 12, fontWeight: 600,
          color: 'var(--color-primary-light)', marginBottom: 24,
        }}>
          <Zap size={12} /> Powered by Tether WDK
        </div>

        <h1 style={{
          fontSize: 56, fontWeight: 900, lineHeight: 1.1,
          fontFamily: 'var(--font-heading)', marginBottom: 20,
        }}>
          <span className="gradient-text">Cross-Chain</span>
          <br />Atomic Swaps
        </h1>

        <p style={{ fontSize: 18, color: 'var(--color-text-secondary)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Swap tokens across Solana, Ethereum, BNB Chain, and Bitcoin Cash in seconds.
          No bridges. No wrapping. Fully trustless.
        </p>

        <NavLink to="/trade" className="btn-gradient" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontSize: 16 }}>
          Start Swapping <ArrowRight size={18} />
        </NavLink>
      </section>

      {/* Chains */}
      <section style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 80, flexWrap: 'wrap' }}>
        {CHAINS.map(c => (
          <div key={c.name} className="glass-card" style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={c.icon} alt={c.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</span>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 80 }}>
        {FEATURES.map(f => (
          <div key={f.title} className="glass-card" style={{ padding: 28 }}>
            <div style={{ color: 'var(--color-primary)', marginBottom: 14 }}>{f.icon}</div>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="glass-card" style={{ padding: 40, marginBottom: 80, textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, fontFamily: 'var(--font-heading)' }}>
          How It <span className="gradient-text">Works</span>
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[
            { step: '1', title: 'Create Wallet', desc: 'Generate a WDK seed phrase. One wallet — all chains.' },
            { step: '2', title: 'Pick Tokens', desc: 'Select source & destination chains and tokens.' },
            { step: '3', title: 'Swap', desc: 'Your intent is matched and filled atomically in ~15s.' },
          ].map(s => (
            <div key={s.step} style={{ maxWidth: 200, textAlign: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                fontWeight: 800, fontSize: 18, color: '#fff',
              }}>{s.step}</div>
              <h4 style={{ fontWeight: 700, marginBottom: 6 }}>{s.title}</h4>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
