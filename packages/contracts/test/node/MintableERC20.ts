import { beforeEach, describe, it } from "node:test";
import { expect } from "chai";
import { network } from "hardhat";
import { GetContractReturnType, parseEther, WalletClient } from "viem";
import hre from "hardhat";

const { viem } = await hre.network.connect();

describe("MintableERC20", function () {
  let token: GetContractReturnType;
  let owner: WalletClient;
  let otherAccount: WalletClient;
  let viem: any;

  beforeEach(async function () {
    const { viem: connectedViem } = await network.connect();
    viem = connectedViem;

    const [ownerClient, otherAccountClient] = await viem.getWalletClients();
    owner = ownerClient;
    otherAccount = otherAccountClient;

    const presale = await viem.deployContract("Presale");
    const tokenImplementation = await viem.deployContract("MintableERC20");

    const initialFee = parseEther("0.01");

    const presaleFactory = await viem.deployContract("PresaleFactory", [
      presale.address,
      tokenImplementation.address,
      initialFee,
      owner.account.address,
    ]);

    const publicClient = await viem.getPublicClient();

    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const futureTime = currentTime + 3600n;

    const hash = await presaleFactory.write.createPresale(
      [{
        name: "Test Token",
        symbol: "TST",
        supply: parseEther("1000"),
        price: parseEther("0.01"),
        hardCap: parseEther("10"), // hardCap
        softCap: parseEther("5"), // softCap
        startTime: currentTime, // startTime
        endTime: futureTime, // endTime
        softCapPrice: parseEther("0.01"), // softCapPrice
      }],
      { value: parseEther("0.01") }
    );
    await publicClient.waitForTransactionReceipt({ hash });

    const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
    const presaleAddress = presaleEvents[0].args.presale;

    const presaleContract = await viem.getContractAt(
      "Presale",
      presaleAddress as `0x${string}`
    );

    const tokenAddress = await presaleContract.read.token();
    token = await viem.getContractAt("MintableERC20", tokenAddress);
  });

  it("should be deployed with the correct name and symbol", async function () {
    expect(await token.read.name()).to.equal("Test Token");
    expect(await token.read.symbol()).to.equal("TST");
  });

  it("should mint initial supply to the deployer", async function () {
    const balance = await token.read.balanceOf([owner.account.address]);
    expect(balance).to.equal(parseEther("1000"));
  });

  it("should allow minter to mint new tokens", async function () {
    // Grant minter role to otherAccount for testing purposes
    await token.write.grantRole([
      await token.read.MINTER_ROLE(),
      otherAccount.account.address,
    ]);

    await token.write.mint([otherAccount.account.address, parseEther("500")], {
      account: otherAccount.account,
    });

    const balance = await token.read.balanceOf([otherAccount.account.address]);
    expect(balance).to.equal(parseEther("500"));
  });

  it("should not allow non-minter to mint new tokens", async function () {
    await viem.assertions.revertWithCustomError(
      token.write.mint([otherAccount.account.address, parseEther("500")], {
        account: otherAccount.account,
      }),
      token,
      "AccessControlUnauthorizedAccount"
    );
  });
});
