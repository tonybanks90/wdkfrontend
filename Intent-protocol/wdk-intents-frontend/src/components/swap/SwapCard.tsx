import { useState } from 'react';
import { ArrowDownUp, Zap, Info, Loader2 } from 'lucide-react';
import { ChainSelector } from './ChainSelector';
import { TokenSelector } from './TokenSelector';
import { CHAINS_LIST } from '../../lib/chains';
import { getTokensForChain } from '../../lib/tokens';
import { useWDK } from '../../providers/WDKProvider';

export function SwapCard() {
  const wdk = useWDK();
  
  const [fromChain, setFromChain] = useState(CHAINS_LIST[0]); // Solana
  const [toChain, setToChain] = useState(CHAINS_LIST[1]); // BSC
  
  const [fromToken, setFromToken] = useState(getTokensForChain(CHAINS_LIST[0].id)[0]);
  const [toToken, setToToken] = useState(getTokensForChain(CHAINS_LIST[1].id)[0]);
  
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  const outputAmount = amount ? (parseFloat(amount) * 0.999).toFixed(6) : '';

  const flipDirection = () => {
    const tmpChain = fromChain;
    const tmpToken = fromToken;
    setFromChain(toChain);
    setToChain(tmpChain);
    setFromToken(toToken);
    setToToken(tmpToken);
  };

  const handleFromChainSelect = (chain: typeof CHAINS_LIST[0]) => {
    setFromChain(chain);
    setFromToken(getTokensForChain(chain.id)[0]);
    if (chain.id === toChain.id) {
      const other = CHAINS_LIST.find(c => c.id !== chain.id)!;
      setToChain(other);
      setToToken(getTokensForChain(other.id)[0]);
    }
  };

  const handleToChainSelect = (chain: typeof CHAINS_LIST[0]) => {
    setToChain(chain);
    setToToken(getTokensForChain(chain.id)[0]);
    if (chain.id === fromChain.id) {
      const other = CHAINS_LIST.find(c => c.id !== chain.id)!;
      setFromChain(other);
      setFromToken(getTokensForChain(other.id)[0]);
    }
  };

  const executeSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsSwapping(true);
    try {
      // TODO: Connect to Intent Relayer API here
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`Swap initiated! ${amount} ${fromToken.symbol} on ${fromChain.name} -> ${toToken.symbol} on ${toChain.name}`);
      setAmount('');
    } catch (e) {
      console.error(e);
      alert('Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: 0 }}>
      {/* Header */}
      <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-heading)' }}>Swap</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <Zap size={12} color="var(--color-accent-mint)" /> Cross-Chain Atomic
        </div>
      </div>

      <div style={{ padding: '20px 28px 28px' }}>
        {/* FROM INPUT */}
        <div className="swap-input-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>You Pay</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Balance: 0.00</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="number"
              className="swap-input"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <div style={{ display: 'flex', gap: 6, shrink: 0 }}>
              <ChainSelector 
                selectedChain={fromChain} 
                onSelect={handleFromChainSelect} 
              />
              <TokenSelector 
                selectedToken={fromToken} 
                chainId={fromChain.id} 
                onSelect={setFromToken} 
              />
            </div>
          </div>
        </div>

        {/* DIRECTION BUTTON */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '-12px 0', position: 'relative', zIndex: 5 }}>
          <button className="swap-direction-btn" onClick={flipDirection}>
            <ArrowDownUp size={18} />
          </button>
        </div>

        {/* TO INPUT */}
        <div className="swap-input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>You Receive</span>
            <span style={{ fontSize: 12, color: 'var(--color-accent-mint)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={10} /> Instant Fill
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              className="swap-input"
              placeholder="0.00"
              value={outputAmount}
              readOnly
              style={{ flex: 1, minWidth: 0, opacity: 0.8 }}
            />
            <div style={{ display: 'flex', gap: 6, shrink: 0 }}>
              <ChainSelector 
                selectedChain={toChain} 
                onSelect={handleToChainSelect} 
              />
              <TokenSelector 
                selectedToken={toToken} 
                chainId={toChain.id} 
                onSelect={setToToken} 
              />
            </div>
          </div>
        </div>

        {/* Route Info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)',
          padding: '12px 0 16px', justifyContent: 'center',
        }}>
          <Info size={12} />
          {fromChain.symbol} → {toChain.symbol} via Intent Relayer • ~15s • 0.1% fee
        </div>

        {/* SWAP BUTTON */}
        <button 
          className="btn-gradient" 
          onClick={executeSwap}
          disabled={!amount || isSwapping || !wdk.isInitialized}
          style={{ 
            width: '100%', fontSize: 16, padding: '16px 0',
            opacity: (!amount || isSwapping || !wdk.isInitialized) ? 0.6 : 1,
            cursor: (!amount || isSwapping || !wdk.isInitialized) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSwapping ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Loader2 size={18} className="spin" /> Processing...
            </span>
          ) : !wdk.isInitialized ? (
            'Connect Wallet to Swap'
          ) : !amount ? (
            'Enter Amount'
          ) : (
            'Swap Now'
          )}
        </button>
      </div>
    </div>
  );
}
