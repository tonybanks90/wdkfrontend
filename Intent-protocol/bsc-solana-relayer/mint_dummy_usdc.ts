import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { SolanaService } from './src/services/SolanaService.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const s = new SolanaService();
    await s.ready;
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    // We fund the EXACT wallet that the relayer framework generates internally.
    const wallet = s.keypair;
    const relayerWdkAddress = s.publicKey;
    
    console.log(`\n================================`);
    console.log(`Solana Service Wallet: ${relayerWdkAddress.toBase58()}`);
    console.log(`================================\n`);
    
    // 1. Create new Mint (Mock USDC)
    console.log("Creating Mock USDC Mint on Devnet...");
    const mint = await createMint(
        connection,
        wallet,             // payer
        wallet.publicKey,   // mintConfig.mintAuthority
        null,               // freezeAuthority
        6                   // USDC typically has 6 decimals
    );
    console.log(`\n================================`);
    console.log(`Mock USDC Mint Address: ${mint.toBase58()}`);
    console.log(`================================\n`);
    
    // 2. Create Associated Token Account for Real Receiver
    console.log("Configuring Associated Token Account...");
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,           // payer
        mint,
        relayerWdkAddress, // owner
        true              // allowOwnerOffCurve
    );
    
    // 3. Mint 1,000 Mock USDC
    console.log("Minting 1,000 Mock USDC natively...");
    await mintTo(
        connection,
        wallet,                 // payer
        mint,                   // mint
        tokenAccount.address,   // destination
        wallet,                 // authority
        1000 * 1_000_000        // 1000 tokens (6 decimals)
    );
    
    console.log(`✅ Success! Minted 1,000 Mock USDC to WDK Address ${relayerWdkAddress.toBase58()} at ATA: ${tokenAccount.address.toBase58()}`);
}

main().catch(console.error);
