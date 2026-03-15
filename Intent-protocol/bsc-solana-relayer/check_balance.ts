import { ethers } from 'ethers';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
dotenv.config();

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

// Canonical USDT Contract Addresses
const BSC_TESTNET_USDT = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd';
const SOLANA_MAINNET_USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

async function checkEVM(pk: string) {
    console.log("=== Checking BSC Testnet Balances ===");
    const testnetProvider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    const wallet = new ethers.Wallet(pk, testnetProvider);
    console.log(`BSC Testnet Address: ${wallet.address}`);
    
    // Native BNB
    try {
        const bal = await testnetProvider.getBalance(wallet.address);
        console.log(`tBNB (Testnet) Balance: ${ethers.formatEther(bal)} tBNB`);
    } catch (e: any) {
        console.log(`tBNB Error: ${e.message}`);
    }

    // USDT
    try {
        const usdtContract = new ethers.Contract(BSC_TESTNET_USDT, ERC20_ABI, testnetProvider);
        const bal = await usdtContract.balanceOf(wallet.address);
        const dec = await usdtContract.decimals();
        console.log(`USDT (Testnet) Balance: ${ethers.formatUnits(bal, dec)} USDT`);
    } catch(e: any) {
        console.log(`USDT BSC Testnet Error: ${e.message}`);
    }
}

async function checkSolana(secretKeyArray: number[]) {
    if (!secretKeyArray) {
        console.log("\nNo Solana private key configured in .env");
        return;
    }
    console.log("\n=== Checking Solana Balances ===");
    const keypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    console.log(`Solana Address: ${keypair.publicKey.toBase58()}`);

    const mainnetConnection = new Connection('https://api.mainnet-beta.solana.com');
    const devnetConnection = new Connection('https://api.devnet.solana.com');

    for (const conn of [{name: 'Mainnet', c: mainnetConnection}, {name: 'Devnet', c: devnetConnection}]) {
        try {
            // Native SOL
            const bal = await conn.c.getBalance(keypair.publicKey);
            console.log(`SOL (${conn.name}) Balance: ${bal / 1e9} SOL`);

            let usdtMint = SOLANA_MAINNET_USDT;
            let usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // Mainnet USDC
            
            if (conn.name === 'Devnet') {
                usdtMint = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"; // Common Devnet USDT
                usdcMint = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // Standard Devnet USDC
            }

            // Check USDT
            const usdtAccounts = await conn.c.getParsedTokenAccountsByOwner(keypair.publicKey, { mint: new PublicKey(usdtMint) });
            let usdtBal = 0;
            for (let accountInfo of usdtAccounts.value) { usdtBal += accountInfo.account.data.parsed.info.tokenAmount.uiAmount || 0; }
            console.log(`USDT SPL (${conn.name}) Balance: ${usdtBal} USDT`);

            // Check USDC
            const usdcAccounts = await conn.c.getParsedTokenAccountsByOwner(keypair.publicKey, { mint: new PublicKey(usdcMint) });
            let usdcBal = 0;
            for (let accountInfo of usdcAccounts.value) { usdcBal += accountInfo.account.data.parsed.info.tokenAmount.uiAmount || 0; }
            console.log(`USDC SPL (${conn.name}) Balance: ${usdcBal} USDC`);

        } catch(e: any) {
             console.log(`Solana ${conn.name} Error: ${e.message}`);
        }
    }
}

async function main() {
    console.log("Starting Cross-Chain Balance Checker...\n");
    
    // Check Hardcoded File Key
    const filePk = '0x59a5a36f77e027b8a274ab08a764fac08f4c121aeb2bd32f8895d710e4b38acd';
    await checkEVM(filePk);

    // Check Relayer .env Key
    if (process.env.BSC_PRIVATE_KEY) {
        console.log("\n[ Checking Relayer .env BSC Key ]");
        await checkEVM(process.env.BSC_PRIVATE_KEY);
    }

    let solPkArray = null;
    if (process.env.SOLANA_PRIVATE_KEY) {
        try {
            solPkArray = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
        } catch(e) {}
    }
    await checkSolana(solPkArray);
}

main().catch(console.error);
