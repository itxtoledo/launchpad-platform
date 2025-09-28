import type { HardhatUserConfig } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import hardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";
import HardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";

const config: HardhatUserConfig = {
  plugins: [
    hardhatVerify,
    HardhatNodeTestRunner,
    hardhatViem,
    hardhatViemAssertions,
    hardhatNetworkHelpers,
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
  verify: {
    etherscan: {
      apiKey: "YOUR_ETHERSCAN_API_KEY",
    },
    blockscout: {
      enabled: true,
    },
  },
};

export default config;
