import { useState, useEffect } from 'react';
import { ArrowDownUp, Zap, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { TokenSelector } from './TokenSelector';
import { CHAINS_LIST } from '../../lib/chains';
import { getTokensForChain } from '../../lib/tokens';
import type { Token } from '../../lib/tokens';
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

  // Dynamic Pricing State
  const [prices, setPrices] = useState<Record<string, number>>({ SOL: 0, BNB: 0, ETH: 0, WETH: 0, USDC: 1, USDT: 1 });
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  // Balance State
  const [balance, setBalance] = useState('0');
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  // Fetch balances whenever token or network changes
  useEffect(() => {
    let mounted = true;
    const fetchUserBalance = async () => {
      if (!wdk.isInitialized) {
        if (mounted) setBalance('0');
        return;
      }
      
      setIsFetchingBalance(true);
      try {
        if (fromChain.id === 'solana' && wdk.solanaAddress) {
          const connection = new Connection(fromChain.rpcUrl || 'https://api.devnet.solana.com', 'confirmed');
          const pubkey = new PublicKey(wdk.solanaAddress);
          
          if (fromToken.address === 'native') {
            const bal = await connection.getBalance(pubkey);
            if (mounted) setBalance((bal / 1e9).toFixed(4));
          } else {
            const mint = new PublicKey(fromToken.address);
            const ata = await splToken.getAssociatedTokenAddress(mint, pubkey);
            try {
              const accountInfo = await connection.getTokenAccountBalance(ata);
              if (mounted) setBalance(accountInfo.value.uiAmountString || '0');
            } catch (e) {
              if (mounted) setBalance('0'); // ATA might not exist
            }
          }
        } else if ((fromChain.id === 'bsc' || fromChain.id === 'ethereum') && wdk.evmAddress) {
          const provider = new ethers.JsonRpcProvider(fromChain.rpcUrl);
          
          if (fromToken.address === 'native') {
            const bal = await provider.getBalance(wdk.evmAddress);
            if (mounted) setBalance(ethers.formatEther(bal));
          } else {
            const erc20 = new Contract(fromToken.address, ['function balanceOf(address) view returns (uint256)'], provider);
            const bal = await erc20.balanceOf(wdk.evmAddress);
            if (mounted) setBalance(ethers.formatUnits(bal, fromToken.decimals));
          }
        }
      } catch (e) {
        console.warn('Failed to fetch balance:', e);
        if (mounted) setBalance('0');
      } finally {
        if (mounted) setIsFetchingBalance(false);
      }
    };
    
    fetchUserBalance();
    const interval = setInterval(fetchUserBalance, 10000); // Polling every 10s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [wdk.isInitialized, wdk.evmAddress, wdk.solanaAddress, fromChain, fromToken]);

  // Fetch prices on mount
  useEffect(() => {
    let mounted = true;
    const fetchMarketPrices = async () => {
      setIsFetchingPrice(true);
      try {
        const [solRes, bnbRes, ethRes] = await Promise.allSettled([
          fetch('/api/bitfinex/v2/calc/fx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ccy1: 'SOL', ccy2: 'USD' }),
          }).then(r => r.json()),
          fetch('/api/bitfinex/v2/calc/fx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ccy1: 'BNB', ccy2: 'USD' }),
          }).then(r => r.json()),
          fetch('/api/bitfinex/v2/calc/fx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ccy1: 'ETH', ccy2: 'USD' }),
          }).then(r => r.json()),
        ]);
        if (mounted) {
          const ethPrice = ethRes.status === 'fulfilled' && Array.isArray(ethRes.value) ? ethRes.value[0] : 0;
          setPrices({
            SOL: solRes.status === 'fulfilled' && Array.isArray(solRes.value) ? solRes.value[0] : 0,
            BNB: bnbRes.status === 'fulfilled' && Array.isArray(bnbRes.value) ? bnbRes.value[0] : 0,
            ETH: ethPrice,
            WETH: ethPrice,
            USDC: 1,
            USDT: 1
          });
        }
      } catch (err) {
        console.warn('[SwapCard] Failed to fetch proxy prices:', err);
      } finally {
        if (mounted) setIsFetchingPrice(false);
      }
    };
    fetchMarketPrices();
    return () => { mounted = false; };
  }, []);

  // Calculate output based on dynamic market prices mapping
  let outputAmount = '';
  if (amount && parseFloat(amount) > 0) {
    const fromSymbol = fromToken.symbol.includes('SOL') ? 'SOL' : fromToken.symbol.includes('BNB') ? 'BNB' : fromToken.symbol;
    const toSymbol = toToken.symbol.includes('SOL') ? 'SOL' : toToken.symbol.includes('BNB') ? 'BNB' : toToken.symbol;
    
    // If we have valid prices for both legs (or fallback to 1:1 if API breaks)
    const fromUsd = prices[fromSymbol] || 1;
    const toUsd = prices[toSymbol] || 1;
    
    // 0.1% bridge fee
    const feeCoefficient = 0.999;
    const rawOutput = (parseFloat(amount) * fromUsd) / toUsd;
    outputAmount = (rawOutput * feeCoefficient).toFixed(6);
  }

  const flipDirection = () => {
    const tmpChain = fromChain;
    const tmpToken = fromToken;
    setFromChain(toChain);
    setToChain(tmpChain);
    setFromToken(toToken);
    setToToken(tmpToken);
  };

  const handleFromTokenSelect = (token: Token) => {
    setFromToken(token);
    const newChain = CHAINS_LIST.find(c => c.id === token.chainId)!;
    setFromChain(newChain);
    
    // Prevent duplicate cross-chain cycles natively
    if (newChain.id === toChain.id) {
      const otherChain = CHAINS_LIST.find(c => c.id !== newChain.id)!;
      setToChain(otherChain);
      setToToken(getTokensForChain(otherChain.id)[0]);
    }
  };

  const handleToTokenSelect = (token: Token) => {
    setToToken(token);
    const newChain = CHAINS_LIST.find(c => c.id === token.chainId)!;
    setToChain(newChain);
    
    // Reverse bump
    if (newChain.id === fromChain.id) {
      const otherChain = CHAINS_LIST.find(c => c.id !== newChain.id)!;
      setFromChain(otherChain);
      setFromToken(getTokensForChain(otherChain.id)[0]);
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
      const secretBytes = new Uint8Array(32);
      crypto.getRandomValues(secretBytes);
      const secretHex = "0x" + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      // [FIX] HTLC cross-chain compatibility standard uses SHA-256 natively, not EVM KECCAK-256
      const hashlock = ethers.sha256(secretHex);
      
      // Save secret locally so user can claim on destination chain later
      localStorage.setItem(`secret_${hashlock}`, secretHex);

      const parsedAmount = parseUnits(amount, fromToken.decimals);

      if (fromChain.id === 'bsc' || fromChain.id === 'ethereum') {
        const htlcAddress = fromChain.id === 'ethereum' 
          ? '0xF5eFC84aa1EB987EaAD4Ae00F0d2cf805882Dff4' // Sepolia HTLC
          : EVM_HTLC_ADDRESS; // BSC Testnet HTLC

        const contract = new Contract(htlcAddress, INTENT_HTLC_ABI, wdk.evmSigner);

        console.log(`[Swap] Creating EVM Escrow for ${amount} ${fromToken.symbol} on ${fromChain.name}...`);
        
        // Ensure provider connection
        const provider = new ethers.JsonRpcProvider(fromChain.rpcUrl);
        const connectedSigner = wdk.evmSigner.connect(provider);
        const connectedContract = contract.connect(connectedSigner) as Contract;

        if (fromToken.address !== 'native') {
          console.log(`[Swap] Checking ERC-20 Allowance for ${fromToken.symbol}...`);
          const erc20 = new Contract(fromToken.address, [
            'function allowance(address owner, address spender) view returns (uint256)',
            'function approve(address spender, uint256 amount) returns (bool)'
          ], connectedSigner);
          
          const allowance: bigint = await erc20.allowance(connectedSigner.address, htlcAddress);
          if (allowance < parsedAmount) {
            console.log(`[Swap] Insufficient allowance. Approving ${amount} ${fromToken.symbol}...`);
            const approveTx = await erc20.approve(htlcAddress, parsedAmount);
            await approveTx.wait();
            console.log('[Swap] Token approved!');
          } else {
            console.log('[Swap] Allowance sufficient.');
          }
        }

        // [FIX] Recipient MUST be the Relayer's address so the Relayer can claim EVM assets!
        const RELAYER_EVM_ADDRESS = '0x50dc187298778e10417327b7648928a45cBFF815';

        const tx = await connectedContract.createEscrow(
          hashlock,
          RELAYER_EVM_ADDRESS,
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

        console.log(`[Swap] Calling Relayer API with EVM Escrow ID: ${escrowId}...`);
        
        if (fromChain.id === 'ethereum') {
          await RelayerAPI.requestEthToSolanaSwap({
            makerAddress: wdk.evmAddress!,
            recipientAddress: wdk.solanaAddress!,
            sellAmount: parsedAmount.toString(),
            buyAmount: parseUnits(outputAmount, toToken.decimals).toString(),
            hashlock,
            ethEscrowId: escrowId
          });
        } else {
          await RelayerAPI.requestBscToSolanaSwap({
            makerAddress: wdk.evmAddress!,
            recipientAddress: wdk.solanaAddress!,
            sellAmount: parsedAmount.toString(),
            buyAmount: parseUnits(outputAmount, toToken.decimals).toString(),
            hashlock,
            bscEscrowId: escrowId
          });
        }

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
        
        // Handle "native" SOL by treating it as Wrapped SOL (wSOL) for SPL Token Escrow
        const mintStr = fromToken.address === 'native' ? 'So11111111111111111111111111111111111111112' : fromToken.address;
        const tokenMint = new PublicKey(mintStr);

        const [escrowPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("escrow"), maker.toBuffer(), Buffer.from(ethers.getBytes(hashlock))],
          programId
        );
        const [vaultPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("vault"), escrowPda.toBuffer()],
          programId
        );

        const makerTokenAccount = await splToken.getAssociatedTokenAddress(tokenMint, maker);
        
        console.log('--- [Swap Debug] Solana Execution Parameters ---');
        console.log('Maker PDA:', maker.toBase58());
        console.log('Taker:', taker.toBase58());
        console.log('Token Mint:', tokenMint.toBase58());
        console.log('Escrow PDA:', escrowPda.toBase58());
        console.log('Vault PDA:', vaultPda.toBase58());
        console.log('Maker Token Account (Must exist!):', makerTokenAccount.toBase58());
        console.log('------------------------------------------------');

        const amountBN = new BN(parsedAmount.toString());
        const timelockBN = new BN(Math.floor(Date.now() / 1000) + 7200);

        let signature = '';
        try {
          const tx = new web3.Transaction();

        // 1. If Native SOL, handle ATA and Wrapping dynamically
        if (fromToken.address === 'native') {
          console.log('[Swap] Native SOL detected. Ensuring wSOL ATA exists and wrapping...');
          const accountInfo = await connection.getAccountInfo(makerTokenAccount);
          
          if (!accountInfo) {
            console.log('[Swap] Creating Associated Token Account for wSOL...');
            tx.add(
              splToken.createAssociatedTokenAccountInstruction(
                maker, // payer
                makerTokenAccount, // ata
                maker, // owner
                tokenMint // mint (wSOL)
              )
            );
          }

          console.log(`[Swap] Wrapping ${amount} SOL into wSOL...`);
          // Transfer SOL to the ATA
          tx.add(
            SystemProgram.transfer({
              fromPubkey: maker,
              toPubkey: makerTokenAccount,
              lamports: parsedAmount, // transfer the exact amount
            })
          );
          // Sync Native instruction to finalize the wrap
          tx.add(splToken.createSyncNativeInstruction(makerTokenAccount));
        }

        // 2. Add the Anchor Initialize Escrow Instruction
        const swapIx = await program.methods
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
          .instruction();

        tx.add(swapIx);

          const latestBlockhash = await connection.getLatestBlockhash();
          tx.recentBlockhash = latestBlockhash.blockhash;
          tx.feePayer = maker;
          tx.sign(keypair);
          
          signature = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction({ signature, ...latestBlockhash });
          console.log('[Swap] Solana Escrow created. TX:', signature);
        } catch (simError: any) {
          console.error('[Swap Error] Solana execution failed heavily:', simError);
          console.error('[Swap Error Debug JSON] =>', JSON.stringify(simError, Object.getOwnPropertyNames(simError), 2));
          if (simError.logs) {
            console.error('[Swap Error] Program Logs:', JSON.stringify(simError.logs, null, 2));
          }
          if (simError.message && simError.message.includes('custom program error: 0xbc4')) {
            console.error('[Swap Error Breakdown] Error 0xbc4 (3012) means AccountNotInitialized. Your wallet DOES NOT have the wSOL (or specified SPL) token account initialized yet. You must either wrap your SOL, or the frontend must append an AssociatedTokenAccount create instruction.');
          }
          throw simError; // rethrow to abort swap flow
        }

        console.log(`[Swap] Calling Relayer API with Solana Escrow PDA: ${escrowPda.toBase58()}...`);
        
        if (toChain.id === 'ethereum') {
          await RelayerAPI.requestSolanaToEthSwap({
            makerAddress: wdk.solanaAddress!,
            recipientAddress: wdk.evmAddress!,
            sellAmount: parsedAmount.toString(),
            buyAmount: parseUnits(outputAmount, toToken.decimals).toString(),
            hashlock,
            solanaEscrowPda: escrowPda.toBase58()
          });
          alert(`Swap initiated! Backend relayer processing ETH output...`);
        } else {
          await RelayerAPI.requestSolanaToBscSwap({
            makerAddress: wdk.solanaAddress!,
            recipientAddress: wdk.evmAddress!,
            sellAmount: parsedAmount.toString(),
            buyAmount: parseUnits(outputAmount, toToken.decimals).toString(),
            hashlock,
            solanaEscrowPda: escrowPda.toBase58()
          });
          alert(`Swap initiated! Backend relayer processing BSC output...`);
        }

        setLastTxHash(signature);
        setAmount('');
      }
    } catch (e: any) {
      console.error('================ COMPREHENSIVE SWAP ERROR ================');
      console.error('[Swap] Execution error instance:', e);
      if (e.reason) console.error('[Swap Error Reason]:', e.reason);
      if (e.code) console.error('[Swap Error Code]:', e.code);
      if (e.transaction) console.error('[Swap Failed Tx Payload]:', JSON.stringify(e.transaction, null, 2));
      console.error('[Swap Error Raw JSON]:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
      console.error('==========================================================');
      alert('Swap failed. Check console for detailed Web3 errors -> ' + (e.reason || e.message || 'Unknown Error'));
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-disabled)' }}>
          <Zap size={12} color="var(--color-primary-light)" /> Cross-Chain Atomic
        </div>
      </div>

      <div style={{ padding: '20px 28px 28px' }}>
        {/* FROM INPUT */}
        <div className="swap-input-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-disabled)', fontWeight: 600 }}>You Pay</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-disabled)' }}>
              Balance: {isFetchingBalance ? '...' : parseFloat(balance).toFixed(4)}
            </span>
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
              <TokenSelector 
                selectedToken={fromToken} 
                onSelect={handleFromTokenSelect} 
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
            <span style={{ fontSize: 13, color: 'var(--color-text-disabled)', fontWeight: 600 }}>You Receive</span>
            <span style={{ fontSize: 12, color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {isFetchingPrice ? <Loader2 size={10} className="spin" /> : <Zap size={10} />} 
              {isFetchingPrice ? 'Fetching Oracle...' : 'Instant Fill'}
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
              <TokenSelector 
                selectedToken={toToken} 
                onSelect={handleToTokenSelect} 
              />
            </div>
          </div>
        </div>

        {/* Route Info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-disabled)',
          padding: '12px 0 16px', justifyContent: 'center',
        }}>
          <Info size={12} />
          {fromChain.symbol} → {toChain.symbol} via Intent Relayer • ~15s • 0.1% fee
        </div>

        {lastTxHash && (
          <div style={{
            margin: '0 0 16px 0', padding: '12px', background: 'rgba(0,147,147,0.1)',
            border: '1px solid var(--color-primary-light)', borderRadius: 12,
            display: 'flex', flexDirection: 'column', gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary-light)', fontSize: 13, fontWeight: 700 }}>
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
          disabled={!amount || isSwapping || !wdk.isInitialized || (parseFloat(amount) > parseFloat(balance))}
          style={{ 
            width: '100%', fontSize: 16, padding: '16px 0',
            opacity: (!amount || isSwapping || !wdk.isInitialized || (parseFloat(amount) > parseFloat(balance))) ? 0.6 : 1,
            cursor: (!amount || isSwapping || !wdk.isInitialized || (parseFloat(amount) > parseFloat(balance))) ? 'not-allowed' : 'pointer'
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
          ) : parseFloat(amount) > parseFloat(balance) ? (
            'Insufficient Balance'
          ) : (
            'Swap Now'
          )}
        </button>
      </div>
    </div>
  );
}
