import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying IntentHTLC with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");

  // Deploy MockERC20 (USDT)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdt = await MockERC20.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("\n✅ Mock USDT deployed to:", usdtAddress);

  // Mint to Relayer (0xf39Fd6...) and User Test Wallet (0x709979...)
  await usdt.mint("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", ethers.parseUnits("100", 18));
  await usdt.mint("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", ethers.parseUnits("100", 18));
  // User E2E test wallet (0x59c69 - derived is 0x318a...)
  await usdt.mint("0x318a63dEd371020d25670edeeCeD1E193E8D947E", ethers.parseUnits("100", 18));

  // Deploy IntentHTLC
  const IntentHTLC = await ethers.getContractFactory("IntentHTLC");
  const htlc = await IntentHTLC.deploy();
  await htlc.waitForDeployment();

  const htlcAddress = await htlc.getAddress();
  console.log("\n✅ IntentHTLC deployed to:", htlcAddress);
  console.log("   Admin:", await htlc.admin());

  // Log deployment info for relayer configuration
  console.log("\n--- Copy these to your .env ---");
  console.log(`INTENT_HTLC_ADDRESS=${htlcAddress}`);
  console.log(`MOCK_USDT_ADDRESS=${usdtAddress}`);
  console.log("-------------------------------\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
