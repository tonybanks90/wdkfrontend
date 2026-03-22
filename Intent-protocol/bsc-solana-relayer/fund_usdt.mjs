import { ethers } from 'ethers';
async function run() {
    try {
        const p = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const s = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', p);
        const usdtAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
        const abi = ['function mint(address to, uint256 amount)'];
        const usdt = new ethers.Contract(usdtAddress, abi, s);
        // Mint an unlimited ocean of USDT to swallow any decimal mismatches
        const tx = await usdt.mint('0x027B2ed190559E69b34eec9aE6BE9d002fa81152', ethers.parseEther('1000000000000'));
        await tx.wait();
        console.log('Minted 1,000,000,000,000 Mock USDT!');
    } catch (e) {
        console.error('Failed to fund USDT:', e);
    }
}
run();
