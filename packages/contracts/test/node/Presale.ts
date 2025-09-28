import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEther, type PublicClient, type WalletClient } from "viem";
import hre from "hardhat";
import { type ContractReturnType } from "@nomicfoundation/hardhat-viem/types";

const { viem, networkHelpers } = await hre.network.connect();

describe("Presale", function () {
  let presaleFactory: ContractReturnType<"PresaleFactory">;
  let owner: WalletClient;
  let otherAccount: WalletClient;
  let publicClient: PublicClient;

  beforeEach(async function () {
    const presale = await viem.deployContract("Presale");
    const token = await viem.deployContract("MintableERC20");
    const [ownerClient, otherAccountClient] = await viem.getWalletClients();
    owner = ownerClient;
    otherAccount = otherAccountClient;

    const initialFee = parseEther("0.01");

    presaleFactory = await viem.deployContract("PresaleFactory", [
      presale.address,
      token.address,
      initialFee,
      owner.account!.address,
    ]);

    publicClient = await viem.getPublicClient();
  });

  // Basic presale functionality tests without soft cap complexity
  describe("Basic Presale", function () {
    it("Should allow contribution during active presale", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour in the future

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"),
            softCap: parseEther("0"), // Explicitly using BigInt
            startTime: currentTime,
            endTime: futureTime,
            softCapPrice: parseEther("0"), // Explicitly using BigInt
          },
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presale = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`
      );

      // Contribute to the presale using the other account
      await presale.write.contribute([1n], {
        value: parseEther("0.01"),
        account: otherAccount.account!,
      });

      // Check that contribution was recorded
      const ethContribution = await presale.read.ethContributions([
        otherAccount.account!.address,
      ]);
      assert.equal(ethContribution, parseEther("0.01"));
    });

    it("Should allow token claiming after contribution", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour in the future

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"),
            softCap: parseEther("0"), // Explicitly set to 0
            startTime: currentTime,
            endTime: futureTime,
            softCapPrice: parseEther("0"),
          },
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presale = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`
      );

      // Contribute to the presale using the other account
      await presale.write.contribute([2n], {
        value: parseEther("0.02"),
        account: otherAccount.account!,
      });

      // Check that contribution was recorded in tokenContributions
      const tokenContributions = await presale.read.tokenContributions([
        otherAccount.account!.address,
      ]);
      const expectedTokenContributions = 2n * 10n ** 18n; // 2 tokens with 18 decimals
      assert.equal(tokenContributions, expectedTokenContributions);

      // Claim tokens using the other account
      await presale.write.claimTokens({ account: otherAccount.account! });

      // Check token balance
      const clonedTokenAddress = await presale.read.token();
      const clonedToken = await viem.getContractAt(
        "MintableERC20",
        clonedTokenAddress
      );

      const balance = await clonedToken.read.balanceOf([
        otherAccount.account!.address,
      ]);
      assert.equal(balance, expectedTokenContributions);
    });

    it("Should allow owner to withdraw ETH after presale", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour in the future

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"),
            softCap: 0n, // No soft cap
            startTime: currentTime,
            endTime: futureTime,
            softCapPrice: 0n,
          },
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presaleForOther = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`
      );

      // Contribute to the presale
      await presaleForOther.write.contribute([5n], {
        value: parseEther("0.05"),
      });

      const presaleForOwner = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`
      );

      const initialOwnerBalance = await publicClient.getBalance({
        address: owner.account!.address,
      });
      const tx = await presaleForOwner.write.withdrawETH();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
      const finalOwnerBalance = await publicClient.getBalance({
        address: owner.account!.address,
      });

      // Check that owner balance increased (accounting for gas)
      assert.ok(finalOwnerBalance > initialOwnerBalance - gasUsed);
    });

    it("Should not allow contribution before start time", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour in the future
      const startTime = currentTime + 7200n; // 2 hours in the future

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"),
            softCap: 0n, // No soft cap
            startTime: startTime, // Start in 2 hours
            endTime: futureTime + 3600n, // End in 2 hours after start
            softCapPrice: 0n,
          },
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presale = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`
      );

      // Try to contribute before start time - should fail
      await viem.assertions.revertWithCustomError(
        presale.write.contribute([1n], { value: parseEther("0.01") }),
        presale,
        "PresaleNotStarted"
      );
    });

    it("Should not allow contribution after end time", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const pastTime = currentTime - 3600n; // 1 hour in the past
      const startTime = currentTime - 7200n; // 2 hours in the past

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"),
            softCap: 0n, // No soft cap
            startTime: startTime, // Started 2 hours ago
            endTime: pastTime, // Ended 1 hour ago
            softCapPrice: 0n,
          },
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presale = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`
      );

      // Try to contribute after end time - should fail
      await viem.assertions.revertWithCustomError(
        presale.write.contribute([1n], { value: parseEther("0.01") }),
        presale,
        "PresaleEnded"
      );
    });

    it("Should respect hard cap", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour in the future

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"), // 0.01 ETH per token
            hardCap: parseEther("2"), // 2 ETH hard cap
            softCap: parseEther("0"), // Explicitly set to 0
            startTime: currentTime,
            endTime: futureTime,
            softCapPrice: parseEther("0"),
          },
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presale = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`
      );

      // Contribute up to the hard cap (1.5 ETH should buy 150 tokens at 0.01 ETH per token)
      await presale.write.contribute([150n], {
        value: parseEther("1.5"),
        account: otherAccount.account!,
      });

      // Try to contribute more than would exceed the hard cap (1 ETH more would make total 2.5 ETH, exceeding 2 ETH hardcap)
      await viem.assertions.revertWithCustomError(
        presale.write.contribute([100n], {
          value: parseEther("1"),
          account: otherAccount.account!,
        }),
        presale,
        "HardCapExceeded"
      );
    });
  });
});
