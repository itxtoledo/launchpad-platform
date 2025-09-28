import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEther, type WalletClient } from "viem";
import hre from "hardhat";
import { ContractReturnType } from "@nomicfoundation/hardhat-viem/types";

const { viem } = await hre.network.connect();

describe("MintableERC20", function () {
  let token: ContractReturnType<"MintableERC20">;
  let owner: WalletClient;
  let otherAccount: WalletClient;

  beforeEach(async function () {
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
      owner.account!.address,
    ]);

    const publicClient = await viem.getPublicClient();

    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const futureTime = currentTime + 3600n;

    const hash = await presaleFactory.write.createPresale(
      [
        {
          name: "Test Token",
          symbol: "TST",
          supply: parseEther("1000"),
          price: parseEther("0.01"),
          hardCap: parseEther("10"), // hardCap
          softCap: parseEther("5"), // softCap
          startTime: currentTime, // startTime
          endTime: futureTime, // endTime
          softCapPrice: parseEther("0.01"), // softCapPrice
        },
      ],
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
    const name = await token.read.name();
    const symbol = await token.read.symbol();
    assert.equal(name, "Test Token");
    assert.equal(symbol, "TST");
  });

  it("should mint initial supply to the deployer", async function () {
    const balance = await token.read.balanceOf([owner.account!.address]);
    assert.equal(balance, parseEther("1000"));
  });

  it("should allow minter to mint new tokens", async function () {
    // Grant minter role to otherAccount for testing purposes
    await token.write.grantRole([
      await token.read.MINTER_ROLE(),
      otherAccount.account!.address,
    ]);

    await token.write.mint([otherAccount.account!.address, parseEther("500")], {
      account: otherAccount.account,
    });

    const balance = await token.read.balanceOf([otherAccount.account!.address]);
    assert.equal(balance, parseEther("500"));
  });

  it("should not allow non-minter to mint new tokens", async function () {
    await viem.assertions.revertWithCustomError(
      token.write.mint([otherAccount.account!.address, parseEther("500")], {
        account: otherAccount.account,
      }),
      token,
      "AccessControlUnauthorizedAccount"
    );
  });
});
