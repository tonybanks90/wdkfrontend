import { ethers } from 'ethers';
import { PublicKey, Keypair } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { SolanaService } from './src/services/SolanaService.js';
import { relayerConfig } from './src/config.js';
import crypto from 'crypto';
import * as anchor from '@coral-xyz/anchor';

const BN = (anchor as any).BN || (anchor as any).default?.BN;

const API_URL = 'http://localhost:3002';

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2E() {
    console.log("=== E2E Test: Solana Devnet -> Local BSC ===");

    // User's wallet (Hardhat Account #1)
    const userBscWallet = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", new ethers.JsonRpcProvider("http://127.0.0.1:8545"));
    
    // We already have solanaService configured for the Relayer which has SOL. 
    // We'll just use it to lock funds (emulating the User locking on Solana).
    const solanaService = new SolanaService();
    // Wait for init
    await delay(3000); 

    // 1. Generate Secret and Hashlock
    const secret = crypto.randomBytes(32);
    const hashlock = crypto.createHash('sha256').update(secret).digest();
    
    console.log(`Secret (Hex): 0x${secret.toString('hex')}`);
    console.log(`Hashlock (Hex): 0x${hashlock.toString('hex')}`);

    // Amounts
    const sellAmountUSDC = 10_000; // 0.01 USDC (6 decimals)
    const buyAmountUSDT = ethers.parseUnits("0.01", 6).toString(); // Mock USDT uses 6 decimals(18 decimals)

    // 2. User Creates Escrow on Solana Devnet
    console.log("\n[User] Creating Escrow on Solana Devnet...");
    const relayerSolanaPubkey = solanaService.publicKey || solanaService.keypair?.publicKey;
    const devnetUsdcMint = new PublicKey("5Rya94T4npZ5vb938buez4HiiTa99wPt4sBPs6oqfuc5"); 
    
    const solanaResult = await solanaService.createEscrow(
        relayerSolanaPubkey!, // The relayer claims the USDC
        hashlock,
        new BN(sellAmountUSDC),
        new BN(Math.floor(Date.now() / 1000) + relayerConfig.timelocks.source),
        devnetUsdcMint
    );
    console.log(`✅ Solana Escrow Created: ${solanaResult.escrowPda}`);
    
    // 3. Notify Relayer via API
    console.log("\n[User] Pinging Relayer API...");
    const apiRes = await fetch(`${API_URL}/swap/solana-to-bsc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            makerAddress: solanaService.publicKey?.toBase58() || solanaService.keypair?.publicKey.toBase58(),
            recipientAddress: userBscWallet.address,
            sellAmount: sellAmountUSDC.toString(),
            buyAmount: buyAmountUSDT,
            hashlock: "0x" + hashlock.toString('hex'),
            solanaEscrowPda: solanaResult.escrowPda,
        })
    });
    const responseJson = await apiRes.json();
    console.log("Relayer response:", responseJson);
    const intentId = responseJson.intent?.id || responseJson.id;

    // 4. Wait for Relayer to fill BSC Escrow
    console.log("\n[User] Waiting for Relayer to lock funds on BSC...");
    let bscEscrowId = null;
    while (!bscEscrowId) {
        await delay(5000);
        const orderRes = await fetch(`${API_URL}/orders`);
        const orderData = await orderRes.json();
        const orders = [...(orderData.active || []), ...(orderData.completed || [])];
        const order = orders.find((o: any) => o.id === intentId);
        
        console.log(`   Status: ${order?.status}`);
        if (order?.status === 'DEST_FILLED' && order?.bscEscrowId) {
            bscEscrowId = order.bscEscrowId;
            console.log(`✅ Relayer filled BSC Escrow ID: ${bscEscrowId}`);
        } else if (order?.status === 'FAILED') {
            console.error(`Relayer failed: ${order.failReason}`);
            process.exit(1);
        }
    }

    // 5. User claims BSC Escrow (reveals secret)
    console.log(`\n[User] Claiming BNB from BSC Escrow ${bscEscrowId}...`);
    
    const HTLC_ABI = [
        "function claim(uint256 escrowId, bytes32 secret) external"
    ];
    const contract = new ethers.Contract(relayerConfig.bsc.htlcAddress, HTLC_ABI, userBscWallet);
    
    let claimTx;
    try {
        claimTx = await contract.claim(bscEscrowId, "0x" + secret.toString('hex'));
        await claimTx.wait();
        console.log(`✅ User claimed BSC funds: ${claimTx.hash}`);
    } catch(e: any) {
        console.error("Claim failed", e.message);
        process.exit(1);
    }

    // 6. Push secret to Relayer API since local Hardhat event polling can be unreliable
    console.log("\n[User] Sending secret to Relayer API...");
    await fetch(`${API_URL}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            intentId: intentId,
            secret: secret.toString('hex')
        })
    });

    console.log("\n[User] Waiting for Relayer to detect claim and finish the swap...");
    while (true) {
        await delay(5000);
        const orderRes = await fetch(`${API_URL}/orders`);
        const orderData = await orderRes.json();
        const orders = [...(orderData.active || []), ...(orderData.completed || [])];
        const order = orders.find((o: any) => o.id === intentId);
        
        console.log(`   Status: ${order?.status}`);
        if (order?.status === 'COMPLETED') {
            console.log(`\n🎉 Swap Complete! Relayer claimed Solana funds. TX: ${order.sourceClaimTx}`);
            break;
        }
    }
}

runE2E().catch(console.error);
