import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './providers/ThemeProvider';
import { WDKProvider } from './providers/WDKProvider';
import { PageShell } from './components/layout/PageShell';
import { FloatingHeader } from './components/layout/FloatingHeader';
import { Footer } from './components/layout/Footer';
import { Toaster } from 'sonner';

// Pages
import LandingPage from './pages/LandingPage';
import TradePage from './pages/TradePage';
import OrdersPage from './pages/OrdersPage';
import PortfolioPage from './pages/PortfolioPage';

import AgentsDashboard from './pages/AgentsDashboard';

export default function App() {
  return (
    <ThemeProvider>
      <WDKProvider>
        <BrowserRouter>
          <PageShell>
            <FloatingHeader />
            <main style={{ paddingTop: '100px', minHeight: '100vh' }}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/trade" element={<TradePage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/agents" element={<AgentsDashboard />} />
              </Routes>
            </main>
            <Footer />
            <Toaster theme="dark" position="bottom-right" richColors />
          </PageShell>
        </BrowserRouter>
      </WDKProvider>
    </ThemeProvider>
  );
}
