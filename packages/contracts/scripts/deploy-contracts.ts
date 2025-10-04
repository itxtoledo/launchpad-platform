import hre from "hardhat";
import { parseEther } from "viem";

async function main() {
  try {
    // Get the viem network connection
    const { viem } = await hre.network.connect();

    // Deploy MintableERC20
    const token = await viem.deployContract("MintableERC20");

    // Deploy Presale
    const presale = await viem.deployContract("Presale");

    // Get the owner account
    const [owner] = await viem.getWalletClients();

    // Deploy PresaleFactory with the deployed contracts and parameters
    const presaleFactory = await viem.deployContract("PresaleFactory", [
      presale.address,
      token.address,
      parseEther("0.001"),
      owner.account!.address,
    ]);

    // Output only the factory address
    console.log(presaleFactory.address);
  } catch (error) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.exit(1);
});
