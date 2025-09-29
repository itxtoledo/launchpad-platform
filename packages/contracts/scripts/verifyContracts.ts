import hre from "hardhat";
import { config } from "hardhat";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

async function verifyContract(
  chainId: number | string,
  address: string,
  params: (string | number)[] = []
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = params.map((p) => `"${p}"`).join(" ");
    const cmd = `npx hardhat verify --network ${chainId} ${address} ${args}`;

    console.info("Calling verify with this command:", cmd);

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Execution failed: ${error.message}`));
        return;
      }
      if (stderr && !stdout) {
        reject(new Error(`stderr: ${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function main() {
  // Get the chain ID from command line if provided
  const desiredChainId = process.argv[4];

  console.log(
    desiredChainId
      ? `Starting contract verification for network ${desiredChainId}...`
      : "Starting contract verification on all available networks..."
  );

  // Check if network configuration is available
  if (!config.networks) {
    throw new Error("Network configuration not found in hardhat.config.ts");
  }

  // Find all deployed_addresses.json files in all deployment folders
  const deploymentsDir = path.resolve("./ignition/deployments");

  console.log("Deployment directory:", deploymentsDir);

  let deploymentFiles: string[] = [];

  if (fs.existsSync(deploymentsDir)) {
    const chainDirs = fs
      .readdirSync(deploymentsDir)
      .filter(
        (dir) =>
          dir.startsWith("chain-") &&
          fs.statSync(path.join(deploymentsDir, dir)).isDirectory()
      );

    deploymentFiles = chainDirs
      .map((chainDir) =>
        path.join(deploymentsDir, chainDir, "deployed_addresses.json")
      )
      .filter((filePath) => fs.existsSync(filePath));
  }

  if (deploymentFiles.length === 0) {
    throw new Error("No deployment files found");
  }

  console.log(`Found ${deploymentFiles.length} deployments to verify\n`);

  // Filter deployments if a specific chainId is provided
  const filteredDeploymentFiles = desiredChainId
    ? deploymentFiles.filter((file) => file.includes(`chain-${desiredChainId}`))
    : deploymentFiles;

  if (desiredChainId && filteredDeploymentFiles.length === 0) {
    throw new Error(`No deployment found for chainId ${desiredChainId}`);
  }

  // For each deployment file, run the verification
  for (const deploymentPath of filteredDeploymentFiles) {
    try {
      // Extract the chain ID from the file path
      const chainIdMatch = deploymentPath.match(/chain-(\d+)/);
      if (!chainIdMatch) {
        console.log(`Could not extract chain ID from path: ${deploymentPath}`);
        continue;
      }

      const chainId = chainIdMatch[1];

      // Check if the network is configured in hardhat
      if (!config.networks[chainId]) {
        console.log(
          `⚠️ Network configuration not found for ChainID: ${chainId}, skipping...`
        );
        continue;
      }

      console.log(`\n--------------------------------------------------`);
      console.log(`Verifying contracts for chain ID: ${chainId}`);

      // Read deployment data
      const deploymentData = JSON.parse(
        fs.readFileSync(deploymentPath, "utf8")
      );

      // Get the list of all deployed contracts
      const deployedContracts = Object.keys(deploymentData);

      if (deployedContracts.length === 0) {
        console.log(
          `⚠️ No contracts found for chain ID ${chainId}, skipping...`
        );
        continue;
      }

      console.log(`${deployedContracts.length} contract(s) found:`);
      for (const contractName of deployedContracts) {
        console.log(`► ${contractName}: ${deploymentData[contractName]}`);
      }

      // Load journal.jsonl to get constructor arguments
      const journalPath = path.join(
        path.dirname(deploymentPath),
        "journal.jsonl"
      );
      let constructorArgs: Record<string, any[]> = {};

      if (fs.existsSync(journalPath)) {
        const journalContent = fs.readFileSync(journalPath, "utf8");
        const journalLines = journalContent
          .split("\n")
          .filter((line) => line.trim());

        for (const line of journalLines) {
          try {
            const journalEntry = JSON.parse(line);
            // Look for contract initialization entries with constructor arguments
            if (
              journalEntry.type === "DEPLOYMENT_EXECUTION_STATE_INITIALIZE" &&
              journalEntry.constructorArgs !== undefined
            ) {
              // The futureId is the contract name in "ModuleName#ContractName" format
              constructorArgs[journalEntry.futureId] =
                journalEntry.constructorArgs;
            }
          } catch (e) {
            // Ignore lines that are not valid JSON
          }
        }
      }

      // Verify each deployed contract
      for (const [contractName, contractAddress] of Object.entries(
        deploymentData
      )) {
        if (contractName !== "PresaleFactoryModule#PresaleFactory") {
          continue;
        }

        if (!contractAddress) {
          console.log(`⚠️ Address not found for ${contractName}, skipping...`);
          continue;
        }

        console.log(`\nVerifying ${contractName} on network ${chainId}...`);

        try {
          // Get constructor arguments for this contract, if they exist
          let args: any[] = [];

          if (
            constructorArgs[contractName] &&
            constructorArgs[contractName].length > 0
          ) {
            // Convert constructor arguments to the appropriate format
            args = constructorArgs[contractName].map((arg) => {
              if (arg && typeof arg === "object" && arg._kind === "bigint") {
                return arg.value;
              }
              return arg;
            });

            console.log(
              `  Using constructor arguments: ${JSON.stringify(args)}`
            );
          }

          // Execute contract verification using the new verifyContract function
          await verifyContract(chainId, contractAddress as string, args);

          console.log(
            `✅ ${contractName} verified successfully on network ${chainId}`
          );
        } catch (error: any) {
          console.log(`❌ Error verifying ${contractName}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error(`Error processing file ${deploymentPath}:`, error);
    }
  }

  console.log("\n--------------------------------------------------");
  console.log("Verification process completed for all networks!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
