import type { ReactNode } from 'react';

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Animated Background */}
      <div className="animated-bg" />
      {children}
    </div>
  );
}
