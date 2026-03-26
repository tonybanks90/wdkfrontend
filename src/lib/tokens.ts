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
  { id: 'solana-sol', symbol: 'SOL', name: 'Solana (Devnet)', icon: '/logos/solana.svg', decimals: 9, chainId: 'solana', address: 'native' },
  { id: 'solana-usdc', symbol: 'USDC', name: 'USD Coin (Devnet)', icon: '/logos/usd-coin-usdc-logo.svg', decimals: 6, chainId: 'solana', address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' },
  
  // BSC Tokens
  { id: 'bsc-bnb', symbol: 'BNB', name: 'BNB (Testnet)', icon: '/logos/bnb-bnb-logo.svg', decimals: 18, chainId: 'bsc', address: 'native' },
  { id: 'bsc-usdt', symbol: 'USDT', name: 'Tether USD (BSC Testnet)', icon: '/logos/tether-usdt-logo.svg', decimals: 18, chainId: 'bsc', address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' },

  // Ethereum Tokens
  { id: 'eth-eth', symbol: 'ETH', name: 'Ethereum Sepolia', icon: '/logos/ethereum-eth-logo.svg', decimals: 18, chainId: 'ethereum', address: 'native' },
  { id: 'eth-weth', symbol: 'WETH', name: 'Wrapped ETH', icon: '/logos/ethereum-eth-logo.svg', decimals: 18, chainId: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
  { id: 'eth-usdt', symbol: 'USDT', name: 'Tether USD (Sepolia)', icon: '/logos/tether-usdt-logo.svg', decimals: 6, chainId: 'ethereum', address: '0xd077a400968890eacc75cdc901f0356c943e4fdb' },
];

export const getTokensForChain = (chainId: string) => TOKENS.filter(t => t.chainId === chainId);
