import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying IntentHTLC with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");

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
  console.log("-------------------------------\n");

  // Verify on BscScan (if API key is set)
  console.log("To verify on BscScan, run:");
  console.log(`npx hardhat verify --network bscTestnet ${htlcAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
