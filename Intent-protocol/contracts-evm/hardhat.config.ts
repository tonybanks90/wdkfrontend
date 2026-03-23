import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

const ETH_MAINNET_RPC = process.env.ETH_MAINNET_RPC || "https://ethereum-rpc.publicnode.com";
const ETH_SEPOLIA_RPC = process.env.ETH_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Ethereum Mainnet
    ethMainnet: {
      url: ETH_MAINNET_RPC,
      chainId: 1,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    // Ethereum Sepolia (Testnet)
    ethSepolia: {
      url: ETH_SEPOLIA_RPC,
      chainId: 11155111,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    // BSC Testnet
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: [DEPLOYER_PRIVATE_KEY],
      gasPrice: 10_000_000_000, // 10 gwei
    },
    // BSC Mainnet
    bscMainnet: {
      url: process.env.BSC_MAINNET_RPC || "https://bsc-dataseed1.binance.org/",
      chainId: 56,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    // Local development
    hardhat: {
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      bscTestnet: BSCSCAN_API_KEY,
      bsc: BSCSCAN_API_KEY,
    },
  },
};

export default config;
