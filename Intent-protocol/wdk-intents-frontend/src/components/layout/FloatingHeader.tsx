import { NavLink } from 'react-router-dom';
import { useTheme } from '../../providers/ThemeProvider';
import { ConnectWalletButton } from '../wallet/ConnectWalletButton';
import { Sun, Moon, Zap } from 'lucide-react';

export function FloatingHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="floating-header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #009393, #00C9A7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
            Intent<span style={{ color: 'var(--color-accent-mint)' }}>DEX</span>
          </span>
        </NavLink>

        {/* Navigation */}
        <nav style={{ display: 'flex', gap: '4px' }}>
          <NavLink to="/trade" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Trade
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Orders
          </NavLink>
          <NavLink to="/portfolio" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Portfolio
          </NavLink>
        </nav>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)',
              borderRadius: 10, width: 38, height: 38, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-secondary)', transition: 'all 0.2s',
            }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* WDK Wallet Connect Button */}
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
