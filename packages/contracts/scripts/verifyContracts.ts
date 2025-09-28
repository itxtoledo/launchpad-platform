import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import { config } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  // Get the chain ID from command line if provided
  const desiredChainId = process.argv[2];

  console.log(
    desiredChainId
      ? `Starting contract verification for network ${desiredChainId}...`
      : "Starting contract verification on all available networks..."
  );

  // Check if network configuration is available
  if (!config.networks) {
    throw new Error(
      "Network configuration not found in hardhat.config.ts"
    );
  }

  // Find all deployed_addresses.json files in all deployment folders
  const deploymentsDir = path.resolve(__dirname, "../ignition/deployments");
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

  console.log(
    `Found ${deploymentFiles.length} deployments to verify\n`
  );

  // Filter deployments if a specific chainId is provided
  const filteredDeploymentFiles = desiredChainId
    ? deploymentFiles.filter((file) => file.includes(`chain-${desiredChainId}`))
    : deploymentFiles;

  if (desiredChainId && filteredDeploymentFiles.length === 0) {
    throw new Error(
      `No deployment found for chainId ${desiredChainId}`
    );
  }

  // For each deployment file, run the verification
  for (const deploymentPath of filteredDeploymentFiles) {
    try {
      // Extract the chain ID from the file path
      const chainIdMatch = deploymentPath.match(/chain-(\d+)/);
      if (!chainIdMatch) {
        console.log(
          `Could not extract chain ID from path: ${deploymentPath}`
        );
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
      const journalPath = path.join(path.dirname(deploymentPath), "journal.jsonl");
      let constructorArgs: Record<string, any[]> = {};
      
      if (fs.existsSync(journalPath)) {
        const journalContent = fs.readFileSync(journalPath, "utf8");
        const journalLines = journalContent.split('\n').filter(line => line.trim());
        
        for (const line of journalLines) {
          try {
            const journalEntry = JSON.parse(line);
            // Look for contract initialization entries with constructor arguments
            if (journalEntry.type === "DEPLOYMENT_EXECUTION_STATE_INITIALIZE" && 
                journalEntry.constructorArgs !== undefined) {
              // The futureId is the contract name in "ModuleName#ContractName" format
              constructorArgs[journalEntry.futureId] = journalEntry.constructorArgs;
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
        if (!contractAddress) {
          console.log(
            `⚠️ Address not found for ${contractName}, skipping...`
          );
          continue;
        }

        console.log(`\nVerifying ${contractName} on network ${chainId}...`);
        
        try {
          // Get constructor arguments for this contract, if they exist
          let args: any[] = [];
          
          if (constructorArgs[contractName] && constructorArgs[contractName].length > 0) {
            // Convert constructor arguments to the appropriate format
            args = constructorArgs[contractName].map(arg => {
              if (arg && typeof arg === 'object' && arg._kind === 'bigint') {
                return arg.value;
              }
              return arg;
            });
            
            console.log(`  Using constructor arguments: ${JSON.stringify(args)}`);
          }
          
          // Execute contract verification using the new verifyContract function
          await verifyContract(
            {
              address: contractAddress as string,
              constructorArgs: args,
              // Determine provider based on network configuration
              provider: determineProviderForNetwork(chainId),
            },
            hre,
          );
          
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

/**
 * Determines the provider for a given network based on common network configurations
 */
function determineProviderForNetwork(chainId: string): "etherscan" | "blockscout" | undefined {
  // Common chain IDs and their respective providers
  const chainProviders: Record<string, "etherscan" | "blockscout"> = {
    "1": "etherscan",      // Ethereum Mainnet
    "5": "etherscan",      // Goerli Testnet
    "11155111": "etherscan", // Sepolia Testnet
    "97": "etherscan",     // BSC Testnet
    "56": "etherscan",     // BSC Mainnet
    "137": "etherscan",    // Polygon Mainnet
    "80001": "etherscan",  // Polygon Mumbai Testnet
    "42161": "etherscan",  // Arbitrum Mainnet
    "421613": "etherscan", // Arbitrum Goerli Testnet
    "10": "etherscan",     // Optimism Mainnet
    "420": "etherscan",    // Optimism Goerli Testnet
    // Add more chain providers as needed
  };

  return chainProviders[chainId];
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
