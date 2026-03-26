import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, Shield, Clock, ArrowRight, Layers, ChevronDown, ExternalLink, BookOpen } from 'lucide-react';

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

const FAQS = [
  {
    q: 'What is IntentDEX?',
    a: 'IntentDEX is a fully decentralized cross-chain exchange powered by Tether WDK. Instead of routing through liquidity pools and bridges, you simply declare your swap intent and our solver network fills it atomically using HTLC hash-locks.',
  },
  {
    q: 'Which chains are supported?',
    a: 'We currently support Solana, Ethereum (Sepolia), and BNB Chain (Testnet) with live atomic swaps. Bitcoin Cash integration is actively in development. Any chain supporting SHA-256 hashing can join the protocol.',
  },
  {
    q: 'How are swaps secured?',
    a: 'Every swap uses Hash Time-Locked Contracts (HTLCs). A cryptographic secret links escrows on both chains — either both sides settle, or both refund automatically after the timelock expires. No trusted third party is ever involved.',
  },
  {
    q: 'Do I need MetaMask or Phantom?',
    a: 'No! IntentDEX uses the Tether Wallet Development Kit (WDK) to generate wallets directly in your browser from a single seed phrase. One wallet works across all supported chains — no extensions needed.',
  },
  {
    q: 'Which tokens does IntentDEX support?',
    a: 'IntentDEX natively supports all three Tether WDK tokens: USDt (Tether stablecoin), USD₮0 (omnichain Tether with native bridging), and XAUT (Tether Gold). Additionally, native assets like SOL, ETH, and BNB are supported via the Velora swap module.',
  },
  {
    q: 'Can AI agents use IntentDEX?',
    a: 'Yes! IntentDEX ships with a native Model Context Protocol (MCP) server that allows AI agents like Claude to autonomously create and execute cross-chain swaps using natural language commands — no human UI interaction required.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="glass-card"
      style={{ padding: '20px 24px', cursor: 'pointer', transition: 'all 0.2s ease' }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <h4 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{q}</h4>
        <ChevronDown
          size={18}
          style={{
            flexShrink: 0,
            color: 'var(--color-primary)',
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </div>
      {open && (
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
          {a}
        </p>
      )}
    </div>
  );
}

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

      {/* FAQ */}
      <section style={{ marginBottom: 80 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, fontFamily: 'var(--font-heading)', textAlign: 'center' }}>
          Frequently <span className="gradient-text">Asked</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700, margin: '0 auto' }}>
          {FAQS.map(faq => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '40px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 18, fontFamily: 'var(--font-heading)' }}>
            <span className="gradient-text">Intent</span>DEX
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>© 2026</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a
            href="https://x.com/intentdex"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--color-text-secondary)', textDecoration: 'none',
              fontSize: 14, fontWeight: 600, transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary-light)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          >
            <ExternalLink size={14} /> @intentdex
          </a>
          <a
            href="https://intentdex.gitbook.io/intentdex-docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--color-text-secondary)', textDecoration: 'none',
              fontSize: 14, fontWeight: 600, transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary-light)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          >
            <BookOpen size={14} /> Docs
          </a>
        </div>
      </footer>
    </div>
  );
}
