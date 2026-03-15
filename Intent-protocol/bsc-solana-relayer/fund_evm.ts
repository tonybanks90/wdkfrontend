import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    // Hardhat Account 0 default private key
    const pk = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const signer = new ethers.Wallet(pk, provider);
    
    // Removed BNB gas funding - Node already supplied gas.
    
    const usdtAddress = process.env.MOCK_USDT_ADDRESS!;
    const abi = ['function mint(address to, uint256 amount)'];
    const usdt = new ethers.Contract(usdtAddress, abi, signer);
    
    const relayerWdkAddress = '0x027B2ed190559E69b34eec9aE6BE9d002fa81152';
    const tx = await usdt.mint(relayerWdkAddress, 1000000000); // 1000 USDT (6 decimal places)
    await tx.wait();
    console.log("Minted 1000 Mock USDT to Relayer WDK Wallet:", relayerWdkAddress);
}
main().catch(console.error);
