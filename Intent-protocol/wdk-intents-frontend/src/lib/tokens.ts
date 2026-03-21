export interface Token {
  id: string;      // Unique identifier, e.g., 'solana-usdc'
  symbol: string;  // Ticker symbol
  name: string;    // Full name
  icon: string;    // Emoji or SVG path
  decimals: number;// Token decimals
  chainId: string; // ID of the chain it belongs to ('solana' | 'bsc')
  address: string; // Native or contract address
}

export const TOKENS: Token[] = [
  // Solana Tokens
  { id: 'solana-sol', symbol: 'SOL', name: 'Solana', icon: '◎', decimals: 9, chainId: 'solana', address: 'native' },
  { id: 'solana-usdc', symbol: 'USDC', name: 'USD Coin', icon: '💲', decimals: 6, chainId: 'solana', address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' }, // Devnet USDC
  
  // BSC Tokens
  { id: 'bsc-bnb', symbol: 'BNB', name: 'BNB', icon: '⬡', decimals: 18, chainId: 'bsc', address: 'native' },
  { id: 'bsc-usdt', symbol: 'USDT', name: 'Tether USD', icon: '₮', decimals: 18, chainId: 'bsc', address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' }, // Local Mock USDT
];

export const getTokensForChain = (chainId: string) => TOKENS.filter(t => t.chainId === chainId);
