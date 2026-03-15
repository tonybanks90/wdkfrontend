import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const secret = JSON.parse(process.env.SOLANA_PRIVATE_KEY || '[]');
    const fromWallet = Keypair.fromSecretKey(new Uint8Array(secret));
    
    const toAddress = new PublicKey('EHC6QYT8ibbwQGR2ZVrqDHAd8oX5rCRE2qkZvhSRSDmx');
    const amount = 100_000_000; // 0.1 SOL
    
    console.log(`Sending 0.1 SOL from ${fromWallet.publicKey.toBase58()} to ${toAddress.toBase58()}`);
    
    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: fromWallet.publicKey,
            toPubkey: toAddress,
            lamports: amount,
        })
    );
    
    const signature = await sendAndConfirmTransaction(connection, tx, [fromWallet]);
    console.log("✅ Transfer successful! Signature:", signature);
}

main().catch(console.error);
