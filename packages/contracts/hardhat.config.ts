import { configVariable, task, type HardhatUserConfig } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import hardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";
import HardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import HardhatIgnitionViem from "@nomicfoundation/hardhat-ignition-viem";
import HardhatKeystore from "@nomicfoundation/hardhat-keystore";
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

const exportAbiTask = task("export-abi", "Exports the ABIs")
  .setAction(() => import("./tasks/export-abi.js"))
  .build();

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
    chainType: "l1",
    url: chain.rpcUrls.default.http[0],
    accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    chainId: chain.id,
    type: "http",
  };
}

const config: HardhatUserConfig = {
  plugins: [
    HardhatKeystore,
    hardhatVerify,
    HardhatNodeTestRunner,
    hardhatViem,
    hardhatViemAssertions,
    hardhatNetworkHelpers,
    HardhatIgnitionViem,
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
  networks,
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
    blockscout: {
      enabled: false,
    },
  },
  tasks: [exportAbiTask],
};

export default config;
