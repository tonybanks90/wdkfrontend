import chalk from 'chalk';
import { BSCService } from './BSCService.js';
import { SolanaService } from './SolanaService.js';
import { CrossChainIntent } from '../types/intent.js';
import { relayerConfig } from '../config.js';
import { PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { ethers } from 'ethers';

const BN = (anchor as any).BN || (anchor as any).default?.BN;

export class BSCSolanaRelayerCore {
    private bscService: BSCService;
    private solanaService: SolanaService;
    private activeIntents: Map<string, CrossChainIntent> = new Map();
    private completedIntents: CrossChainIntent[] = [];

    constructor() {
        this.bscService = new BSCService();
        this.solanaService = new SolanaService();

        console.log(chalk.green('🔗 BSC-Solana Relayer Core Initialized'));

        // Start Polling Loop
        setInterval(() => this.pollIntents(), relayerConfig.pollIntervalMs);
    }

    /**
     * Handle BSC → Solana swap request
     */
    async handleBSCToSolana(params: {
        makerAddress: string;       // User's BSC Address
        recipientAddress: string;   // User's Solana Address
        sellAmount: string;         // BSC Wei
        buyAmount: string;          // SOL Lamports
        hashlock: string;
        bscEscrowId: string;        // The ID on the BSC contract
    }): Promise<CrossChainIntent> {
        const intentId = `bsc_sol_${Date.now()}`;
        const now = Math.floor(Date.now() / 1000);

        console.log(chalk.blue(`\n📥 Processing BSC → Solana Swap`));
        console.log(chalk.gray(`   ID: ${intentId}`));

        const intent: CrossChainIntent = {
            id: intentId,
            direction: 'BSC_TO_SOL',
            makerAddress: params.makerAddress,
            takerAddress: this.solanaService.publicKey.toBase58(),
            recipientAddress: params.recipientAddress,
            sellAmount: params.sellAmount,
            buyAmount: params.buyAmount,
            hashlock: params.hashlock,
            sourceTimelock: now + relayerConfig.timelocks.source,
            destTimelock: now + relayerConfig.timelocks.dest,
            bscEscrowId: params.bscEscrowId,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
        };

        this.activeIntents.set(intentId, intent);
        return intent;
    }

    /**
     * Handle Solana → BSC swap request
     */
    async handleSolanaToBSC(params: {
        makerAddress: string;       // User's Solana Address
        recipientAddress: string;   // User's BSC Address
        sellAmount: string;         // SOL Lamports
        buyAmount: string;          // BSC Wei
        hashlock: string;
        solanaEscrowPda: string;    // Escrow PDA on Solana
    }): Promise<CrossChainIntent> {
        const intentId = `sol_bsc_${Date.now()}`;
        const now = Math.floor(Date.now() / 1000);

        console.log(chalk.blue(`\n📥 Processing Solana → BSC Swap`));
        console.log(chalk.gray(`   ID: ${intentId}`));

        const intent: CrossChainIntent = {
            id: intentId,
            direction: 'SOL_TO_BSC',
            makerAddress: params.makerAddress,
            takerAddress: this.bscService.walletAddress || '',
            recipientAddress: params.recipientAddress,
            sellAmount: params.sellAmount,
            buyAmount: params.buyAmount,
            hashlock: params.hashlock,
            sourceTimelock: now + relayerConfig.timelocks.source,
            destTimelock: now + relayerConfig.timelocks.dest,
            solanaEscrowPda: params.solanaEscrowPda,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
        };

        this.activeIntents.set(intentId, intent);
        return intent;
    }

    public async pollIntents() {
        for (const [id, intent] of this.activeIntents) {
            try {
                if (intent.direction === 'BSC_TO_SOL') {
                    await this.processBSCToSolana(intent);
                } else if (intent.direction === 'SOL_TO_BSC') {
                    await this.processSolanaToBSC(intent);
                }
            } catch (e: any) {
                console.error(chalk.red(`Error processing intent ${id}:`), e.message);
            }
        }
    }

    /**
     * Process Logic: BSC -> Solana
     */
    private async processBSCToSolana(intent: CrossChainIntent) {
        // 1. PENDING -> SOURCE_LOCKED
        if (intent.status === 'PENDING' && intent.bscEscrowId) {
            const details = await this.bscService.getEscrowDetails(intent.bscEscrowId);
            if (details && !details.claimed && !details.refunded) {
                // Check if balance is correct
                if (BigInt(details.amount) >= BigInt(intent.sellAmount)) {
                    console.log(chalk.green(`✅ BSC Locked confirmed: ${details.amount} Wei`));
                    intent.status = 'SOURCE_LOCKED';
                    intent.updatedAt = Date.now();
                }
            }
        }

        // 2. SOURCE_LOCKED -> DEST_FILLED (Relayer fills Solana)
        if (intent.status === 'SOURCE_LOCKED' && !intent.destFillTx) {
            console.log(chalk.cyan(`⚡ Filling on Solana (Destination) natively using SPL USDC...`));
            try {
                const hashBuf = Buffer.from(intent.hashlock.replace('0x', ''), 'hex');
                // Use Standard Devnet USDC rather than NATIVE_MINT
                const devnetUsdcMint = new PublicKey("5Rya94T4npZ5vb938buez4HiiTa99wPt4sBPs6oqfuc5"); 
                
                const result = await this.solanaService.createEscrow(
                    new PublicKey(intent.recipientAddress),
                    hashBuf,
                    new BN(intent.buyAmount),
                    new BN(intent.destTimelock),
                    devnetUsdcMint
                );

                intent.destFillTx = result.tx;
                intent.solanaEscrowPda = result.escrowPda;
                intent.status = 'DEST_FILLED';
                intent.updatedAt = Date.now();
                console.log(chalk.green(`✅ Solana Filled. Waiting for User to claim...`));
            } catch (e: any) {
                console.error(chalk.red(`❌ Solana fill failed: ${e.message}`));
                intent.fillRetries = (intent.fillRetries || 0) + 1;
                if (intent.fillRetries >= 3) {
                    intent.status = 'FAILED';
                    intent.failReason = e.message;
                    this.activeIntents.delete(intent.id);
                    this.completedIntents.push(intent);
                }
            }
        }

        // 3. DEST_FILLED -> DEST_CLAIMED
        if (intent.status === 'DEST_FILLED' && intent.solanaEscrowPda) {
            const secret = intent.secret || await this.solanaService.watchForSecret(new PublicKey(intent.solanaEscrowPda));
            if (secret && !intent.destClaimTx) {
                console.log(chalk.green(`✅ Secret Revealed on Solana: ${secret}`));
                intent.secret = secret;
                intent.status = 'DEST_CLAIMED';
                await this.claimSourceBSC(intent);
            }
        }
    }

    /**
     * Process Logic: Solana -> BSC
     */
    private async processSolanaToBSC(intent: CrossChainIntent) {
        // 1. PENDING -> SOURCE_LOCKED
        if (intent.status === 'PENDING' && intent.solanaEscrowPda) {
            try {
                const escrowPda = new PublicKey(intent.solanaEscrowPda);
                const accountInfo = await this.solanaService.connection.getAccountInfo(escrowPda);
                if (accountInfo) {
                    intent.status = 'SOURCE_LOCKED';
                    intent.updatedAt = Date.now();
                    console.log(chalk.green(`✅ Solana Locked confirmed (${accountInfo.lamports} lamports)`));
                }
            } catch (e) { /* ignore until next poll */ }
        }

        // 2. SOURCE_LOCKED -> DEST_FILLED (Relayer fills BSC)
        if (intent.status === 'SOURCE_LOCKED' && !intent.destFillTx) {
            console.log(chalk.cyan(`⚡ Filling on BSC (Destination) natively using ERC-20 Tether...`));
            try {
                const mockUsdtAddress = process.env.MOCK_USDT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Dummy fallback
                const result = await this.bscService.createEscrow(
                    intent.hashlock,
                    intent.recipientAddress,
                    intent.buyAmount,
                    relayerConfig.timelocks.dest,
                    mockUsdtAddress
                );

                intent.destFillTx = result.txHash;
                intent.bscEscrowId = result.escrowId;
                intent.status = 'DEST_FILLED';
                intent.updatedAt = Date.now();
                console.log(chalk.green(`✅ BSC Filled. Waiting for User to claim...`));
            } catch (e: any) {
                console.error(chalk.red(`❌ BSC fill failed: ${e.message}`));
                intent.fillRetries = (intent.fillRetries || 0) + 1;
                if (intent.fillRetries >= 3) {
                    intent.status = 'FAILED';
                    intent.failReason = e.message;
                    this.activeIntents.delete(intent.id);
                    this.completedIntents.push(intent);
                }
            }
        }

        // 3. DEST_FILLED -> DEST_CLAIMED (using EVM Events!)
        if (intent.status === 'DEST_FILLED' && intent.bscEscrowId) {
            // Check if secret was revealed via API
            if (intent.secret) {
                console.log(chalk.green(`✅ Secret Revealed via API: ${intent.secret}`));
                intent.status = 'DEST_CLAIMED';
                await this.claimSourceSolana(intent);
                return;
            }

            // Check if BSCService caught the EscrowClaimed event!
            const detectedSecret = this.bscService.getDetectedSecret(intent.bscEscrowId);
            if (detectedSecret) {
                console.log(chalk.green(`✅ Secret Detected via BSC Event: ${detectedSecret}`));
                intent.secret = detectedSecret;
                intent.status = 'DEST_CLAIMED';
                await this.claimSourceSolana(intent);
            }
        }
    }

    // =========================================
    // Atomic Claims
    // =========================================

    private async claimSourceBSC(intent: CrossChainIntent) {
        if (!intent.secret || !intent.bscEscrowId) return;

        try {
            console.log(chalk.cyan(`⚡ Claiming Source BSC...`));
            const txHash = await this.bscService.claimEscrow(intent.bscEscrowId, intent.secret);

            intent.sourceClaimTx = txHash;
            intent.status = 'COMPLETED';
            console.log(chalk.green(`✅ Swap Complete! Claimed BSC: ${txHash}`));

            this.activeIntents.delete(intent.id);
            this.completedIntents.push(intent);
        } catch (e: any) {
            console.error(chalk.red('Failed to claim source BSC:'), e.message);
        }
    }

    private async claimSourceSolana(intent: CrossChainIntent) {
        if (!intent.secret || !intent.solanaEscrowPda) return;

        try {
            console.log(chalk.cyan(`⚡ Claiming Source Solana...`));
            const hashBuf = Buffer.from(intent.hashlock.replace('0x', ''), 'hex');
            const secretBuf = Buffer.from(intent.secret.replace('0x', ''), 'hex');

            const tx = await this.solanaService.claimEscrow(
                new PublicKey(intent.makerAddress),
                hashBuf,
                secretBuf,
                new PublicKey(intent.solanaEscrowPda),
                NATIVE_MINT,
                undefined // auto to relayer
            );

            intent.sourceClaimTx = tx;
            intent.status = 'COMPLETED';
            console.log(chalk.green(`✅ Swap Complete! Claimed SOL: ${tx}`));

            this.activeIntents.delete(intent.id);
            this.completedIntents.push(intent);
        } catch (e: any) {
            console.error(chalk.red('Failed to claim source SOL:'), e.message);
        }
    }

    // Getters
    getIntent(id: string) { return this.activeIntents.get(id) || this.completedIntents.find(i => i.id === id); }
    getActiveIntents() { return Array.from(this.activeIntents.values()); }
    getCompletedIntents() { return this.completedIntents; }
    
    async processSecretRevelation(intentId: string, secret: string) {
        const intent = this.activeIntents.get(intentId);
        if (!intent) return;
        intent.secret = secret.replace('0x', '');
        intent.status = 'DEST_CLAIMED';
        if (intent.direction === 'SOL_TO_BSC') {
            await this.claimSourceSolana(intent);
        } else if (intent.direction === 'BSC_TO_SOL') {
            await this.claimSourceBSC(intent);
        }
    }
}
