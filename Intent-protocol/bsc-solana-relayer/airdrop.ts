import { Connection, PublicKey } from '@solana/web3.js';

async function main() {
    console.log("Requesting Airdrop of 1 SOL to EHC6QYT8ibbwQGR2ZVrqDHAd8oX5rCRE2qkZvhSRSDmx...");
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const pubkey = new PublicKey('EHC6QYT8ibbwQGR2ZVrqDHAd8oX5rCRE2qkZvhSRSDmx');
    
    try {
        const sig = await connection.requestAirdrop(pubkey, 1000000000); // 1 SOL
        await connection.confirmTransaction(sig);
        console.log("✅ Airdrop successful! Signature:", sig);
    } catch(e) {
        console.log("Airdrop rate limit hit or error:", e.message);
    }
}
main();
