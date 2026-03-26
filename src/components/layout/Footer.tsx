import { Zap, Github, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--color-border)',
      padding: '32px 24px',
      marginTop: '80px',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color="var(--color-primary)" />
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Intent Protocol — Cross-Chain Atomic Swaps
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontSize: 11, color: 'var(--color-primary)',
            background: 'rgba(0,147,147,0.1)', padding: '4px 10px', borderRadius: 8,
            fontWeight: 600,
          }}>
            Powered by Tether WDK
          </span>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--color-text-disabled)', transition: 'color 0.2s' }}
          >
            <Github size={16} />
          </a>
          <a href="https://docs.wdk.tether.io" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--color-text-disabled)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, textDecoration: 'none' }}
          >
            WDK Docs <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </footer>
  );
}
