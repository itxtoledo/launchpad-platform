#!/bin/bash

# Script to deploy contracts using viem and return only the factory address

set -e  # Exit on any error

# Navigate to the contracts directory and deploy
cd packages/contracts

# Suppress all output during compilation and deployment, only show the address
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" npx hardhat run scripts/deploy-contracts.ts --network localhost > /tmp/deploy_output 2>&1

# Extract only the address line (last line that starts with 0x)
ADDRESS=$(tail -n 1 /tmp/deploy_output | grep -E '^0x[0-9a-fA-F]{40}$' || echo "")
if [ -n "$ADDRESS" ]; then
    echo "$ADDRESS"
else
    # If the expected format isn't found, output the last line anyway
    tail -n 1 /tmp/deploy_output
fi

# Clean up temporary file
rm -f /tmp/deploy_output