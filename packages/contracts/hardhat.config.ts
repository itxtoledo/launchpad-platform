import { configVariable, type HardhatUserConfig } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import hardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";
import HardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import hardhatAbiExporter from "@solidstate/hardhat-abi-exporter";
import {
  bsc,
  bscTestnet,
  mainnet,
  sepolia,
  polygon,
  polygonAmoy,
  celo,
  celoAlfajores,
} from "viem/chains";

export const desiredChains = [
  // 56
  bsc,
  // 1
  mainnet,
  // 137
  polygon,
  // 42220
  celo,
  // ========== Testnets ==========
  // 11155111
  sepolia,
  // 97
  bscTestnet,
  // 44787
  celoAlfajores,
  // 80002
  polygonAmoy,
];

const networks: HardhatUserConfig["networks"] = {};

for (const chain of desiredChains) {
  networks[chain.id.toString()] = {
    url: chain.rpcUrls.default.http[0],
    accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    chainId: chain.id,
    type: "http",
  };
}

const config: HardhatUserConfig = {
  plugins: [
    hardhatVerify,
    HardhatNodeTestRunner,
    hardhatViem,
    hardhatViemAssertions,
    hardhatNetworkHelpers,
    hardhatAbiExporter,
  ],
  paths: {
    tests: {
      nodejs: "test/node",
    },
  },
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  abiExporter: [
    {
      path: "./abi",
      format: "json",
      runOnCompile: true,
    },
    {
      path: "./abi_ts",
      format: "typescript",
      clear: true,
      runOnCompile: true,
    },
  ],
  networks,
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
    blockscout: {
      enabled: true,
    },
  },
};

export default config;
