import { Terminal, Copy, Check, Bot, Zap, ShieldCheck, ChevronRight, GlobeLock } from 'lucide-react';
import { useState } from 'react';

export default function AgentsDashboard() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px 24px', display: 'flex', flexDirection: 'column', gap: '64px' }}>
      
      {/* HERO SECTION */}
      <section style={{ textAlign: 'center', paddingTop: '64px', paddingBottom: '48px' }}>
        <div style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '8px', 
          background: 'rgba(0, 201, 167, 0.1)', color: 'var(--color-primary-light)', 
          padding: '6px 16px', borderRadius: '100px', fontSize: '14px', fontWeight: 600,
          marginBottom: '24px', border: '1px solid rgba(0, 201, 167, 0.2)'
        }}>
          <Bot size={16} /> WDK + Intent Protocol
        </div>
        <h1 style={{ fontSize: '72px', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.03em' }}>
          AI Agents Get <br />
          <span style={{ 
            background: 'linear-gradient(90deg, var(--color-primary-light) 0%, var(--color-primary) 100%)', 
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' 
          }}>
            Real Wallets.
          </span>
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '22px', maxWidth: '750px', margin: '0 auto', lineHeight: 1.5, marginBottom: '40px' }}>
          Equip your AI Agents with full self-custodial capabilities. Monitor pricing, formulate intents, and execute atomic cross-chain swaps between Solana and EVM without human intervention.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button style={{
            background: 'var(--color-primary)', color: '#000',
            padding: '16px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: 700,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 4px 20px rgba(0, 201, 167, 0.4)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 201, 167, 0.6)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 201, 167, 0.4)'; }}>
            Install OpenClaw MCP <ChevronRight size={18} />
          </button>
          <button style={{
            background: 'transparent', color: 'var(--color-text)',
            padding: '16px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: 600,
            border: '1px solid var(--color-border)', cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
            View Agent Skills Repo
          </button>
        </div>
      </section>

      {/* QUICK START COMMAND */}
      <section style={{ maxWidth: '800px', margin: '0 auto', width: '100%', marginBottom: '32px' }}>
        <div style={{ 
          background: '#0D0D16', border: '1px solid var(--color-border)', borderRadius: '16px', 
          padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Terminal size={24} color="var(--color-text-secondary)" />
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary-light)', fontSize: '16px' }}>
              npx skills add tetherto/intent-agent-skills
            </code>
          </div>
          <button 
            onClick={() => copyToClipboard('npx skills add tetherto/intent-agent-skills', 0)}
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', 
              color: copiedIndex === 0 ? 'var(--color-success)' : 'var(--color-text-secondary)'
            }}
          >
            {copiedIndex === 0 ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {[
          { icon: <ShieldCheck size={28} color="var(--color-primary-light)" />, title: 'WDK Embedded', desc: 'No browser extensions. The Agent natively spins up standard WDK Wallet Managers, keeping private keys securely in the local backend daemon.' },
          { icon: <GlobeLock size={28} color="var(--color-primary-light)" />, title: 'Atomic Intent Logic', desc: 'Agents formulate natural intent hashes and cross-chain escrows. The WDK signs the payload, ensuring mathematically guaranteed execution.' },
          { icon: <Zap size={28} color="var(--color-primary-light)" />, title: 'Autonomous Reasoning', desc: 'Agents can read live oracles, monitor liquidity pools, and trigger completely automated market buys without any human prompting.' },
        ].map((feat, i) => (
          <div key={i} style={{ 
            background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', 
            padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px',
            transition: 'border-color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary-dark)'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}>
            <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {feat.icon}
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{feat.title}</h3>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>{feat.desc}</p>
          </div>
        ))}
      </section>

      {/* USE CASES / CHAT INTERFACE DEMO */}
      <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '48px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '600px', height: '600px', background: 'radial-gradient(circle, var(--color-primary-light) 0%, transparent 70%)', opacity: 0.05, filter: 'blur(60px)', pointerEvents: 'none' }} />
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.5fr', gap: '64px', alignItems: 'flex-start' }}>
          
          {/* Left Column: Descriptions */}
          <div style={{ position: 'sticky', top: '48px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '24px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              Instruct.<br />Autopilot.<br />Execute.
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '18px', lineHeight: 1.6, marginBottom: '32px' }}>
              Agents process complex logistics dynamically. If a merchant exclusively accepts BNB tokens but your Agent only holds Solana, it autonomously bridges the liquidity and finalizes the payment in one breath.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: 'var(--color-surface-variant)', padding: '20px', borderRadius: '16px', borderLeft: '4px solid var(--color-primary)' }}>
                <h4 style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🍕 The Cross-Chain Pizza
                </h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                  A user attempts to execute a physical commerce checkout requiring USDT on the BSC network. The Agent dynamically converts idle Solana liquidity into BSC Tether to settle the exact invoice.
                </p>
              </div>

              <div style={{ background: 'var(--color-surface-variant)', padding: '20px', borderRadius: '16px', borderLeft: '4px solid var(--color-success)' }}>
                <h4 style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📈 DeFi Trading Bot
                </h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                  The Agent monitors external network liquidity via Pyth Oracles. When a predefined arbitrage spread or limit price is hit, it fires atomic swap Escrows to guarantee execution without slippage.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Chat Bubbles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Scenario 1: Pizza */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ alignSelf: 'flex-end', background: 'var(--color-primary-light)', color: '#000', padding: '16px 20px', borderRadius: '20px 20px 0 20px', maxWidth: '85%', fontWeight: 500, fontSize: '15px', boxShadow: '0 4px 15px rgba(0, 201, 167, 0.2)' }}>
                "Pay the $15 Pizza Merchant invoice on BSC using USDT. I think my wallet is mostly Solana though."
              </div>
              
              <div style={{ alignSelf: 'flex-start', background: '#12121A', border: '1px solid var(--color-border)', padding: '20px', borderRadius: '20px 20px 20px 0', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600 }}>
                  <Bot size={16} color="var(--color-primary)" /> OpenClaw Intent Agent
                </div>
                <div style={{ color: 'var(--color-text)', lineHeight: 1.6, fontSize: '15px' }}>
                  <p style={{ marginBottom: '8px' }}>I checked your WDK Wallet state. You have 0 USDT on BSC, but you hold 12.5 SOL on Solana Devnet.</p>
                  <p style={{ margin: 0 }}>I am processing an Intent Swap to convert <strong>0.08 SOL</strong> into exactly <strong>15.00 USDT</strong> on BSC, and forwarding it securely to the merchant's deposit address.</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ background: 'rgba(0, 201, 167, 0.1)', color: 'var(--color-primary-light)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    1. WDK Signed Solana Escrow TX
                  </div>
                  <div style={{ background: 'rgba(0, 201, 167, 0.1)', color: 'var(--color-primary-light)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    2. Relayer Bridge Executed
                  </div>
                  <div style={{ background: 'rgba(0, 201, 167, 0.1)', color: 'var(--color-primary-light)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    3. BSC Invoice Settled ✅
                  </div>
                </div>
              </div>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'var(--color-border)', margin: '16px 0' }} />

            {/* Scenario 2: DeFi Trading */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ alignSelf: 'flex-end', background: 'var(--color-primary-light)', color: '#000', padding: '16px 20px', borderRadius: '20px 20px 0 20px', maxWidth: '85%', fontWeight: 500, fontSize: '15px', boxShadow: '0 4px 15px rgba(0, 201, 167, 0.2)' }}>
                "Start a yield monitoring sweep. If the SOL/USDT market spread between the BSC Liquidity Pool and Solana hits &gt; 2.5%, lock an arbitrage swap."
              </div>
              
              <div style={{ alignSelf: 'flex-start', background: '#12121A', border: '1px solid var(--color-border)', padding: '20px', borderRadius: '20px 20px 20px 0', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600 }}>
                  <Bot size={16} color="var(--color-primary)" /> OpenClaw Intent Agent
                </div>
                <div style={{ color: 'var(--color-text)', lineHeight: 1.6, fontSize: '15px' }}>
                  <p style={{ margin: 0 }}>Spread verified at <strong>2.8%</strong> using Pyth Oracle Feeds. I have autonomously fired an Atomic HTLC transaction leveraging your BSC Tether holdings to claim the discounted Solana yield without human approval delays.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    - 1000 USDT (BSC)
                  </div>
                  <ChevronRight size={14} color="var(--color-text-secondary)" />
                  <div style={{ background: 'rgba(0, 201, 167, 0.1)', color: 'var(--color-primary-light)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    + 5.82 SOL (Solana) 📈
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
