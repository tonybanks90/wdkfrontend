import { ethers } from 'ethers';
async function run() {
    try {
        const p = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const s = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', p);
        const tx = await s.sendTransaction({
            to: '0x027B2ed190559E69b34eec9aE6BE9d002fa81152',
            value: ethers.parseEther('100')
        });
        await tx.wait();
        console.log('Funded 100 BNB successfully!');
    } catch (e) {
        console.error('Failed to fund:', e);
    }
}
run();
