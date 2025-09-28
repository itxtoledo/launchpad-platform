import { task, vars, type HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";
import "hardhat-abi-exporter";
import fs from "fs";
import path from "path";
import * as rimraf from "rimraf";
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
    accounts: [vars.get("DEPLOYER_PRIVATE_KEY")],
    chainId: chain.id,
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  abiExporter: {
    path: "./abi",
  },
  networks,
  etherscan: {
    apiKey: vars.get("ETHERSCAN_API_KEY"),
  },
  sourcify: {
    enabled: true,
  },
};

export default config;

task("export-abi").setAction(async (args, hre, runSuper) => {
  // call super to avoid overwriting functionality
  await runSuper();

  const abiDir = hre.config.abiExporter[0].path;
  const abiTsDir = "abi_ts";

  // delete "abi_ts" directory if it exists
  if (fs.existsSync(abiTsDir)) {
    rimraf.sync(abiTsDir);
  }

  // create empty "abi_ts" directory
  fs.mkdirSync(abiTsDir, { recursive: true });

  console.log(`Exporting ABIs to ${abiTsDir}...`);
  console.log(`ABI directory: ${abiDir}`);

  // read and process all files in "abi" directory, including subdirectories
  processDirectory(abiDir, abiTsDir);
});

function processDirectory(sourceDir: string, targetDir: string) {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const nameWithoutExtension = entry.name.replace(/\.json$/, "");

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, `${nameWithoutExtension}`);

    if (entry.isDirectory()) {
      // create corresponding subdirectory in target directory
      fs.mkdirSync(targetPath, { recursive: true });
      // recursively process the subdirectory
      processDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      // read file contents
      const fileContents = fs.readFileSync(sourcePath, "utf8");
      // apply transformations to file contents
      const transformedContents = transformAbi(
        nameWithoutExtension,
        fileContents
      );
      // write transformed contents to target directory
      fs.writeFileSync(`${targetPath}.ts`, transformedContents);
    }
  }
}

function transformAbi(name: string, abi: string) {
  const trimmedData = abi.endsWith("\n") ? abi.slice(0, -1) : abi;
  const transformedAbi = `const ${name} = ${trimmedData} as const;\nexport default ${name};`;
  return transformedAbi;
}
