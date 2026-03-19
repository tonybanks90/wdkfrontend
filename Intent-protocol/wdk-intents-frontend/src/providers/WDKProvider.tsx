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
import { encryptAndStore, decryptFromStorage, hasStoredWallet, clearStoredWallet } from '../lib/crypto';

interface WDKWalletState {
  isInitialized: boolean;
  isLoading: boolean;
  seedPhrase: string | null;
  evmAddress: string | null;
  solanaAddress: string | null;
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
 * Derive EVM address from seed phrase using ethers (BIP-44 m/44'/60'/0'/0/0)
 */
async function deriveEvmAddress(seedPhrase: string): Promise<string | null> {
  try {
    const { HDNodeWallet } = await import('ethers');
    const wallet = HDNodeWallet.fromPhrase(seedPhrase, undefined, "m/44'/60'/0'/0/0");
    console.log('[WDK] ✅ EVM address:', wallet.address);
    return wallet.address;
  } catch (e: any) {
    console.warn('[WDK] EVM derivation failed:', e.message);
    return null;
  }
}

/**
 * Derive Solana address from seed phrase using the same libs WDK uses internally:
 * - bip39: mnemonicToSeedSync → 64-byte seed
 * - micro-key-producer/slip10: SLIP-10 Ed25519 HD key derivation
 * - @solana/signers: createKeyPairSignerFromPrivateKeyBytes → base58 address
 * 
 * Path: m/44'/501'/0'/0' (same as WDK wallet-solana v1.0.0-beta.4+)
 */
async function deriveSolanaAddress(seedPhrase: string): Promise<string | null> {
  try {
    // Use bip39 to convert mnemonic → 64-byte seed (same as WDK)
    const bip39 = await import('bip39');
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    
    // Use SLIP-10 HD key derivation (same as WDK wallet-solana)
    const { default: HDKey } = await import('micro-key-producer/slip10.js');
    const hdKey = HDKey.fromMasterSeed(seed);
    const derived = hdKey.derive("m/44'/501'/0'/0'", true);
    const privateKey = derived.privateKey;

    // Use @solana/signers to get the address (same as WDK)
    const { createKeyPairSignerFromPrivateKeyBytes } = await import('@solana/signers');
    const signer = await createKeyPairSignerFromPrivateKeyBytes(privateKey);
    
    console.log('[WDK] ✅ Solana address:', signer.address);
    return signer.address;
  } catch (e: any) {
    console.warn('[WDK] Solana derivation via SLIP-10 failed:', e.message);
  }

  // Fallback: try ed25519-hd-key + tweetnacl  
  try {
    const { derivePath, getMasterKeyFromSeed } = await import('ed25519-hd-key');
    const bip39 = await import('bip39');
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const { key } = derivePath("m/44'/501'/0'/0'", Buffer.from(seed).toString('hex'));
    
    // Convert to base58 public key
    const nacl = await import('tweetnacl');
    const keyPair = nacl.sign.keyPair.fromSeed(key);
    
    // Base58 encode the public key
    const bs58 = await import('bs58');
    const address = bs58.default.encode(keyPair.publicKey);
    
    console.log('[WDK] ✅ Solana address (via ed25519-hd-key):', address);
    return address;
  } catch (e: any) {
    console.warn('[WDK] Solana ed25519-hd-key fallback failed:', e.message);
  }
  
  return null;
}

/**
 * Initialize wallet: derive addresses for both chains
 */
async function initializeWallet(seedPhrase: string) {
  const [evmAddress, solanaAddress] = await Promise.all([
    deriveEvmAddress(seedPhrase),
    deriveSolanaAddress(seedPhrase),
  ]);
  return { evmAddress, solanaAddress };
}

export function WDKProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WDKWalletState>({
    isInitialized: false,
    isLoading: false,
    seedPhrase: null,
    evmAddress: null,
    solanaAddress: null,
    evmBalance: null,
    solanaBalance: null,
    error: null,
  });

  const createWallet = useCallback(async (): Promise<string> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const phrase = await generateSeedPhrase();
      const { evmAddress, solanaAddress } = await initializeWallet(phrase);

      setState(s => ({
        ...s,
        isInitialized: true,
        isLoading: false,
        seedPhrase: phrase,
        evmAddress,
        solanaAddress,
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

      const { evmAddress, solanaAddress } = await initializeWallet(trimmed);

      setState(s => ({
        ...s,
        isInitialized: true,
        isLoading: false,
        seedPhrase: trimmed,
        evmAddress,
        solanaAddress,
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

      const { evmAddress, solanaAddress } = await initializeWallet(phrase);

      setState(s => ({
        ...s,
        isInitialized: true,
        isLoading: false,
        seedPhrase: phrase,
        evmAddress,
        solanaAddress,
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
    setState({
      isInitialized: false,
      isLoading: false,
      seedPhrase: null,
      evmAddress: null,
      solanaAddress: null,
      evmBalance: null,
      solanaBalance: null,
      error: null,
    });
  }, []);

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
