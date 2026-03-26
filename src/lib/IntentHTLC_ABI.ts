export const INTENT_HTLC_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "escrowId", "type": "uint256" },
      { "indexed": false, "internalType": "bytes32", "name": "hashlock", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timelock", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "createdAt", "type": "uint256" }
    ],
    "name": "EscrowCreated",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "hashlock", "type": "bytes32" },
      { "internalType": "address", "name": "recipient", "type": "address" },
      { "internalType": "uint256", "name": "timelockDuration", "type": "uint256" },
      { "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "internalType": "uint256", "name": "tokenAmount", "type": "uint256" }
    ],
    "name": "createEscrow",
    "outputs": [{ "internalType": "uint256", "name": "escrowId", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "escrowId", "type": "uint256" },
      { "internalType": "bytes32", "name": "secret", "type": "bytes32" }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Constants extracted from deployed environment
export const EVM_HTLC_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
export const SOLANA_PROGRAM_ID = "5JAWumq5L4B8WrpF3CFox36SZ2bJF4xQvskLksmHRgs2";
