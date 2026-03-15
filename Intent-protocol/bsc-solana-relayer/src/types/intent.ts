export interface CrossChainIntent {
    id: string;
    direction: 'SOL_TO_BSC' | 'BSC_TO_SOL' | 'SOL_TO_USDC' | 'USDC_TO_SOL';
    
    makerAddress: string;       // User's source chain address
    takerAddress: string;       // Relayer's destination chain address
    recipientAddress: string;   // User's destination chain address
    
    sellAmount: string;
    buyAmount: string;
    
    sellToken?: string;
    buyToken?: string;
    
    hashlock: string;           // Hex formatted 32-bytes
    secret?: string;            // Hex formatted 32-bytes (revealed later)
    
    sourceTimelock: number;
    destTimelock: number;
    
    // Chain specific IDs
    solanaEscrowPda?: string;
    bscEscrowId?: string;
    
    status: IntentStatus;
    
    // Transaction hashes for tracking
    sourceFillTx?: string;
    destFillTx?: string;
    destClaimTx?: string;
    sourceClaimTx?: string;
    
    failReason?: string;
    fillRetries?: number;
    
    createdAt: number;
    updatedAt: number;
}

export type IntentStatus = 
    | 'PENDING'         // Initial state, waiting for source lock
    | 'SOURCE_LOCKED'   // Verified locked on source
    | 'DEST_FILLED'     // Relayer filled on dest
    | 'DEST_CLAIMED'    // User claimed on dest (secret revealed)
    | 'COMPLETED'       // Relayer claimed source using secret
    | 'REFUNDED'        // HTLC expired and refunded
    | 'FAILED';         // Something went wrong
