/**
 * WDK Wallet Provider — Browser-compatible
 * 
 * Uses @tetherto/wdk for seed phrase generation/validation.
 * For wallet initialization in browser, WDK wallet modules fail due to 
 * sodium-native (Node.js C++ addon). So we use the same underlying libs 
 * that WDK uses (micro-key-producer/slip10, bip39, @solana/signers) 
 * directly for address derivation.
 * 
 * WDK seed generation: WDK.getRandomSeedPhrase() ✅ (browser-compatible)
 * EVM derivation: ethers HDNodeWallet (BIP-44 m/44'/60'/0'/0/0)
 * Solana derivation: micro-key-producer SLIP-10 (BIP-44 m/44'/501'/0'/0') 
 *   — same derivation WDK-wallet-solana uses internally
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { encryptAndStore, decryptFromStorage, hasStoredWallet } from '../lib/crypto';
import WalletManagerSolana from '@tetherto/wdk-wallet-solana';
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/signers';

interface WDKWalletState {
  isInitialized: boolean;
  isLoading: boolean;
  seedPhrase: string | null;
  evmAddress: string | null;
  solanaAddress: string | null;
  evmSigner: any | null;      // ethers.HDNodeWallet
  solanaSigner: any | null;   // @solana/signers KeyPairSigner (with secretKey)
  solanaAccount: any | null;  // WalletAccountSolana — has sign(), transfer(), sendTransaction()
  solanaManager: any | null;  // WalletManagerSolana — has getFeeRates(), dispose()
  evmBalance: string | null;
  solanaBalance: string | null;
  error: string | null;
}

interface WDKContextType extends WDKWalletState {
  createWallet: () => Promise<string>;
  importWallet: (seedPhrase: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<boolean>;
  saveWallet: (password: string) => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  hasStoredWallet: boolean;
}

const WDKContext = createContext<WDKContextType | null>(null);

export function useWDK() {
  const ctx = useContext(WDKContext);
  if (!ctx) throw new Error('useWDK must be used within WDKProvider');
  return ctx;
}

/**
 * Generate a BIP-39 seed phrase using WDK
 */
async function generateSeedPhrase(): Promise<string> {
  try {
    const { default: WDK } = await import('@tetherto/wdk');
    const phrase = WDK.getRandomSeedPhrase();
    if (phrase && typeof phrase === 'string' && phrase.split(' ').length >= 12) {
      console.log('[WDK] ✅ Seed phrase generated via WDK.getRandomSeedPhrase()');
      return phrase;
    }
  } catch (e: any) {
    console.warn('[WDK] getRandomSeedPhrase failed:', e.message);
  }
  throw new Error('Failed to generate seed phrase via WDK');
}

/**
 * Derive EVM wallet from seed phrase using ethers (BIP-44 m/44'/60'/0'/0/0)
 */
async function deriveEvmWallet(seedPhrase: string): Promise<any | null> {
  try {
    const { HDNodeWallet } = await import('ethers');
    const wallet = HDNodeWallet.fromPhrase(seedPhrase, undefined, "m/44'/60'/0'/0/0");
    console.log('[WDK] ✅ EVM address:', wallet.address);
    return wallet;
  } catch (e: any) {
    console.warn('[WDK] EVM derivation failed:', e.message);
    return null;
  }
}



/**
 * Derive Solana signer from seed phrase using @tetherto/wdk-wallet-solana
 * Per official docs: https://docs.wdk.tether.io/sdk/wallet-modules
 */
async function deriveSolanaSigner(seedPhrase: string): Promise<{signer: any, account: any, manager: any} | null> {
  try {
    // Initialize WDK Solana Wallet Manager with config (per official docs)
    const manager = new WalletManagerSolana(seedPhrase, {
      rpcUrl: 'https://api.devnet.solana.com',
      commitment: 'confirmed',
    });
    const account = await manager.getAccount(0);
    const address = await account.getAddress();
    
    // The Ed25519 private key is a 32-byte Uint8Array
    const privateKey = account.keyPair.privateKey;
    if (!privateKey) throw new Error("No private key derived");
    
    // Create modern signer from @solana/signers
    const baseSigner = await createKeyPairSignerFromPrivateKeyBytes(privateKey);
    console.log('[WDK] ✅ Solana address (via wdk-wallet-solana):', address);
    
    // Build raw 64-byte secretKey for legacy @solana/web3.js / Anchor compatibility
    const secretKey64 = new Uint8Array(64);
    secretKey64.set(privateKey, 0);
    secretKey64.set(account.keyPair.publicKey, 32);

    // IMPORTANT: baseSigner is a FROZEN object from @solana/signers.
    // We must wrap it in a new mutable object instead of mutating it.
    const signer = {
      ...baseSigner,
      address,
      secretKey: secretKey64,
    };

    return { signer, account, manager };
  } catch (e: any) {
    console.warn('[WDK] Solana wdk-wallet derivation failed:', e.message);
    return null;
  }
}

/**
 * Initialize wallet: derive signers for both chains
 */
async function initializeWallet(seedPhrase: string) {
  const [evmSigner, solanaResult] = await Promise.all([
    deriveEvmWallet(seedPhrase),
    deriveSolanaSigner(seedPhrase),
  ]);
  return { 
    evmSigner, 
    solanaSigner: solanaResult?.signer || null,
    solanaAccount: solanaResult?.account || null,
    solanaManager: solanaResult?.manager || null,
    evmAddress: evmSigner?.address || null,
    solanaAddress: solanaResult?.signer?.address || null
  };
}

export function WDKProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WDKWalletState>({
    isInitialized: false,
    isLoading: false,
    seedPhrase: null,
    evmAddress: null,
    solanaAddress: null,
    evmSigner: null,
    solanaSigner: null,
    solanaAccount: null,
    solanaManager: null,
    evmBalance: null,
    solanaBalance: null,
    error: null,
  });

  const createWallet = useCallback(async (): Promise<string> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const phrase = await generateSeedPhrase();
      const { evmAddress, solanaAddress, evmSigner, solanaSigner, solanaAccount, solanaManager } = await initializeWallet(phrase);

      setState(s => ({
        ...s,
        isInitialized: true,
        isLoading: false,
        seedPhrase: phrase,
        evmAddress,
        solanaAddress,
        evmSigner,
        solanaSigner,
        solanaAccount,
        solanaManager,
      }));

      return phrase;
    } catch (error: any) {
      console.error('[WDK] createWallet error:', error);
      setState(s => ({ ...s, isLoading: false, error: error.message }));
      throw error;
    }
  }, []);

  const importWallet = useCallback(async (seedPhrase: string): Promise<void> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const trimmed = seedPhrase.trim().toLowerCase();
      const words = trimmed.split(/\s+/);
      if (words.length !== 12 && words.length !== 24) {
        throw new Error('Seed phrase must be 12 or 24 words');
      }

      const { evmAddress, solanaAddress, evmSigner, solanaSigner, solanaAccount, solanaManager } = await initializeWallet(trimmed);

      setState(s => ({
        ...s,
        isInitialized: true,
        isLoading: false,
        seedPhrase: trimmed,
        evmAddress,
        solanaAddress,
        evmSigner,
        solanaSigner,
        solanaAccount,
        solanaManager,
      }));
    } catch (error: any) {
      console.error('[WDK] importWallet error:', error);
      setState(s => ({ ...s, isLoading: false, error: error.message }));
      throw error;
    }
  }, []);

  const unlockWallet = useCallback(async (password: string): Promise<boolean> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const phrase = await decryptFromStorage(password);
      if (!phrase) {
        setState(s => ({ ...s, isLoading: false, error: 'Wrong password' }));
        return false;
      }

      const { evmAddress, solanaAddress, evmSigner, solanaSigner, solanaAccount, solanaManager } = await initializeWallet(phrase);

      setState(s => ({
        ...s,
        isInitialized: true,
        isLoading: false,
        seedPhrase: phrase,
        evmAddress,
        solanaAddress,
        evmSigner,
        solanaSigner,
        solanaAccount,
        solanaManager,
      }));
      return true;
    } catch (error: any) {
      console.error('[WDK] unlockWallet error:', error);
      setState(s => ({ ...s, isLoading: false, error: error.message }));
      return false;
    }
  }, []);

  const saveWallet = useCallback(async (password: string): Promise<void> => {
    if (!state.seedPhrase) throw new Error('No wallet to save');
    await encryptAndStore(state.seedPhrase, password);
  }, [state.seedPhrase]);

  const disconnect = useCallback(() => {
    // Per WDK docs: dispose() clears private keys from memory
    try { state.solanaAccount?.dispose?.(); } catch {}
    try { state.solanaManager?.dispose?.(); } catch {}
    setState({
      isInitialized: false,
      isLoading: false,
      seedPhrase: null,
      evmAddress: null,
      solanaAddress: null,
      evmSigner: null,
      solanaSigner: null,
      solanaAccount: null,
      solanaManager: null,
      evmBalance: null,
      solanaBalance: null,
      error: null,
    });
  }, [state.solanaAccount, state.solanaManager]);

  const refreshBalances = useCallback(async () => {
    // Balances will be fetched via RPC in a later phase
    console.log('[WDK] Balance refresh — will integrate RPC calls later');
  }, []);

  const contextValue: WDKContextType = {
    ...state,
    createWallet,
    importWallet,
    unlockWallet,
    saveWallet,
    disconnect,
    refreshBalances,
    hasStoredWallet: hasStoredWallet(),
  };

  return (
    <WDKContext.Provider value={contextValue}>
      {children}
    </WDKContext.Provider>
  );
}
