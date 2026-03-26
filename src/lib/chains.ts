export interface Chain {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  color: string;
  rpcUrl?: string; // Optional for future RPC calls
  explorerUrl?: string;
}

export const SUPPORTED_CHAINS: Record<string, Chain> = {
  solana: { 
    id: 'solana', 
    name: 'Solana', 
    symbol: 'SOL', 
    icon: '/logos/solana.svg', 
    color: '#9945FF',
    rpcUrl: 'https://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet'
  },
  bsc: { 
    id: 'bsc', 
    name: 'BNB Chain', 
    symbol: 'BNB', 
    icon: '/logos/bnb-bnb-logo.svg', 
    color: '#F0B90B',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    explorerUrl: 'https://testnet.bscscan.com'
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    icon: '/logos/ethereum-eth-logo.svg',
    color: '#627EEA',
    rpcUrl: 'https://sepolia.drpc.org',
    explorerUrl: 'https://sepolia.etherscan.io'
  },
};

export const CHAINS_LIST = Object.values(SUPPORTED_CHAINS);
