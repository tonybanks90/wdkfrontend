import { useState } from 'react';
import { ArrowDownUp, Zap, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { ChainSelector } from './ChainSelector';
import { TokenSelector } from './TokenSelector';
import { CHAINS_LIST } from '../../lib/chains';
import { getTokensForChain } from '../../lib/tokens';
import { useWDK } from '../../providers/WDKProvider';
import { RelayerAPI } from '../../lib/api';
import { INTENT_HTLC_ABI, EVM_HTLC_ADDRESS } from '../../lib/IntentHTLC_ABI';

// Use a dynamic import for ethers inside functions to prevent global execution block, 
// but we can import standard things here
import { ethers, Contract, parseUnits } from 'ethers';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import { PublicKey, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import intentSwapIdl from '../../lib/intent_swap_idl.json';

export function SwapCard() {
  const wdk = useWDK();
  
  const [fromChain, setFromChain] = useState(CHAINS_LIST[0]); // Solana
  const [toChain, setToChain] = useState(CHAINS_LIST[1]); // BSC
  
  const [fromToken, setFromToken] = useState(getTokensForChain(CHAINS_LIST[0].id)[0]);
  const [toToken, setToToken] = useState(getTokensForChain(CHAINS_LIST[1].id)[0]);
  
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

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
    if (!wdk.isInitialized || !wdk.evmSigner || !wdk.solanaSigner) {
      alert("Wallet not fully initialized!");
      return;
    }
    
    setIsSwapping(true);
    setLastTxHash(null);
    try {
      // 1. Generate pseudo-random secret & hashlock
      // NOTE: In production, cryptographically secure randomness via web crypto is required.
      const secretBytes = new Uint8Array(32);
      crypto.getRandomValues(secretBytes);
      const secretHex = "0x" + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const hashlock = ethers.keccak256(secretHex);

      const parsedAmount = parseUnits(amount, fromToken.decimals);

      if (fromChain.id === 'bsc') {
        const contract = new Contract(EVM_HTLC_ADDRESS, INTENT_HTLC_ABI, wdk.evmSigner);

        console.log(`[Swap] Creating BSC Escrow for ${amount} ${fromToken.symbol}...`);
        
        // Ensure provider connection (WDK Signer might need connection attached if not active)
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const connectedSigner = wdk.evmSigner.connect(provider);
        const connectedContract = contract.connect(connectedSigner) as Contract;

        // recipient is SOL address in our case, but HTLC on EVM expects EVM address! 
        // Relayer actually holds the maker address. Let's pass evmAddress as recipient for local lock. Wait, the Relayer fulfills it to the *recipientAddress* on destination. 
        // The sender locks it for the Relayer's BSC address, or just locks it with the hashlock.
        // For simplicity in UI logic:
        const tx = await connectedContract.createEscrow(
          hashlock,
          connectedSigner.address, // lock to ourselves technically, protected by hashlock! The relayer monitors the hashlock.
          7200, // 2 hours
          fromToken.address, 
          parsedAmount
        );
        
        const receipt = await tx.wait();
        console.log('[Swap] Escrow created. TX:', receipt.hash);

        // Find EscrowCreated event
        let escrowId = "0";
        for (const log of receipt.logs) {
          try {
            const parsed = connectedContract.interface.parseLog(log);
            if (parsed && parsed.name === 'EscrowCreated') {
              escrowId = parsed.args[0].toString();
            }
          } catch (e) {}
        }

        console.log(`[Swap] Calling Relayer API with BSC Escrow ID: ${escrowId}...`);
        await RelayerAPI.requestBscToSolanaSwap({
          makerAddress: wdk.evmAddress!,
          recipientAddress: wdk.solanaAddress!,
          sellAmount: parsedAmount.toString(),
          buyAmount: parseUnits(outputAmount, toToken.decimals).toString(),
          hashlock,
          bscEscrowId: escrowId
        });

        alert(`Swap initiated! Backend relayer processing SOL output...`);
        setLastTxHash(receipt.hash);
        setAmount('');
      } else {
        // SOL -> BSC Escrow Creation
        console.log(`[Swap] Creating Solana Escrow for ${amount} ${fromToken.symbol}...`);
        
        const connection = new Connection("https://api.devnet.solana.com", "confirmed");
        // Re-derive Keypair using the legacy raw secretKey injected in WDKProvider
        const keypair = web3.Keypair.fromSecretKey(wdk.solanaSigner.secretKey);
        
        const anchorWallet = {
          publicKey: keypair.publicKey,
          signTransaction: async (tx: web3.Transaction) => { tx.partialSign(keypair); return tx; },
          signAllTransactions: async (txs: web3.Transaction[]) => { return txs.map(tx => { tx.partialSign(keypair); return tx; }); }
        };

        const provider = new AnchorProvider(connection, anchorWallet as any, { preflightCommitment: "confirmed" });
        const programId = new PublicKey(intentSwapIdl.address);
        const program = new Program(intentSwapIdl as any, provider);

        const maker = keypair.publicKey;
        // Open taker, anyone with knowledge of the hashlock can claim (or the relayer)
        const taker = new PublicKey("11111111111111111111111111111111"); 
        const tokenMint = new PublicKey(fromToken.address);

        const [escrowPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("escrow"), maker.toBuffer(), Buffer.from(ethers.getBytes(hashlock))],
          programId
        );
        const [vaultPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), escrowPda.toBuffer()],
          programId
        );

        const makerTokenAccount = await splToken.getAssociatedTokenAddress(tokenMint, maker);
        
        const amountBN = new BN(parsedAmount.toString());
        const timelockBN = new BN(Math.floor(Date.now() / 1000) + 7200);

        const tx = await program.methods
          .initialize(Array.from(ethers.getBytes(hashlock)), timelockBN, amountBN)
          .accounts({
            maker,
            taker,
            tokenMint,
            escrow: escrowPda,
            makerTokenAccount,
            vault: vaultPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: splToken.TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .transaction();

        const latestBlockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.feePayer = maker;
        tx.sign(keypair);
        
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction({ signature, ...latestBlockhash });
        console.log('[Swap] Solana Escrow created. TX:', signature);

        console.log(`[Swap] Calling Relayer API with Solana Escrow PDA: ${escrowPda.toBase58()}...`);
        await RelayerAPI.requestSolanaToBscSwap({
          makerAddress: wdk.solanaAddress!,
          recipientAddress: wdk.evmAddress!,
          sellAmount: parsedAmount.toString(),
          buyAmount: parseUnits(outputAmount, toToken.decimals).toString(),
          hashlock,
          solanaEscrowPda: escrowPda.toBase58()
        });

        alert(`Swap initiated! Backend relayer processing BSC output...`);
        setLastTxHash(signature);
        setAmount('');
      }
    } catch (e: any) {
      console.error('[Swap] Execution error:', e);
      alert('Swap failed: ' + e.message);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleAirdrop = async () => {
    if (!wdk.isInitialized || !wdk.evmAddress) {
      alert("Please connect WDK wallet first");
      return;
    }
    try {
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      // Set to 100 BNB (100 * 10^18)
      await provider.send('hardhat_setBalance', [
        wdk.evmAddress,
        '0x56bc75e2d63100000'
      ]);
      alert("Airdropped 100 BNB to WDK EVM Wallet \uD83D\uDE80");
    } catch (e: any) {
      alert("Airdrop Failed: " + e.message);
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
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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

        {lastTxHash && (
          <div style={{
            margin: '0 0 16px 0', padding: '12px', background: 'rgba(0,147,147,0.1)',
            border: '1px solid var(--color-accent-mint)', borderRadius: 12,
            display: 'flex', flexDirection: 'column', gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-accent-mint)', fontSize: 13, fontWeight: 700 }}>
              <CheckCircle2 size={16} /> Transaction Locked
            </div>
            <a 
              href={`#`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'underline' }}
            >
              View on Block Explorer: {lastTxHash.substring(0, 10)}...
            </a>
          </div>
        )}

        {/* DEV ONLY AIRDROP */}
        {import.meta.env.DEV && (
          <button 
            onClick={handleAirdrop}
            disabled={!wdk.isInitialized}
            style={{ 
              width: '100%', fontSize: 13, padding: '8px 0', marginBottom: '12px',
              border: '1px dashed var(--color-border)', borderRadius: 8,
              background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer'
            }}
          >
            Dev: 🪂 Airdrop local BNB to Wallet
          </button>
        )}

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
