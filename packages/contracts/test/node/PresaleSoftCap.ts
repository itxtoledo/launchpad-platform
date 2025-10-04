import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEther, type PublicClient, type WalletClient } from "viem";
import hre from "hardhat";
import { type ContractReturnType } from "@nomicfoundation/hardhat-viem/types";

const { viem, networkHelpers } = await hre.network.connect();

describe("Presale with Soft Cap", function () {
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

  describe("Soft Cap Validation", function () {
    it("Should require endTime when softCap is set", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour in the future

      // Attempt to create presale with softCap but without endTime should fail
      // The error is thrown from Presale.initialize, but it bubbles up through the factory call
      try {
        await presaleFactory.write.createPresale(
          [
            {
              name: "Example",
              symbol: "EXM",
              supply: 1000n,
              price: parseEther("0.01"),
              hardCap: parseEther("10"),
              softCap: parseEther("2"), // Setting softCap > 0
              startTime: currentTime,
              endTime: 0n, // Setting endTime to 0 should cause failure
              softCapPrice: parseEther("0.015"), // Higher price for soft cap failure scenario
            },
          ],
          { value: parseEther("0.01") }
        );
        // If no error was thrown, the test should fail
        assert.fail("Expected presale creation to fail with softCap and no endTime");
      } catch (error: any) {
        // Check that the error message contains the expected error
        assert.ok(
          error.message.includes("SoftCapRequiresTimeLimit") || 
          error.message.includes("reverted"),
          `Expected SoftCapRequiresTimeLimit error, got: ${error.message}`
        );
      }
    });

    it("Should allow contribution to presale with softCap during active period", async function () {
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
            softCap: parseEther("2"), // Setting softCap to 2 ETH
            startTime: currentTime,
            endTime: futureTime,
            softCapPrice: parseEther("0.015"), // Higher price for soft cap failure scenario
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
  });

  describe("Soft Cap Success Scenario", function () {
    it("Should allow normal operations when soft cap is reached", async function () {
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
            softCap: parseEther("1"), // Soft cap of 1 ETH
            startTime: currentTime,
            endTime: futureTime,
            softCapPrice: parseEther("0.015"), // Higher price for soft cap failure scenario
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

      // Contribute enough to meet the soft cap
      await presale.write.contribute([100n], {
        value: parseEther("1"),
        account: otherAccount.account!,
      });

      // Check that contribution was recorded
      const ethContribution = await presale.read.ethContributions([
        otherAccount.account!.address,
      ]);
      assert.equal(ethContribution, parseEther("1"));

      // Check that the presale has not failed (should still be active or reached soft cap)
      const hasFailed = await presale.read.presaleFailed();
      assert.equal(hasFailed, false);

      // Should be able to claim tokens normally
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
      const expectedBalance = 100n * 10n ** 18n; // 100 tokens with 18 decimals
      assert.equal(balance, expectedBalance);
    });
  });

  describe("Soft Cap Failure Scenario", function () {
    it("Should allow refunds when endTime is reached without meeting softCap", async function () {
      // Get the latest timestamp from the blockchain
      const latestBlock = await publicClient.getBlock();
      const currentTime = latestBlock.timestamp;
      // Create a presale with a reasonable duration so we can test failure
      const endTime = currentTime + 60n; // 60 seconds in the future

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"),
            softCap: parseEther("5"), // Setting softCap to 5 ETH
            startTime: currentTime,
            endTime: endTime,
            softCapPrice: parseEther("0.015"), // Higher price for soft cap failure scenario
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

      // Contribute less than the softCap before the end time (should work)
      await presale.write.contribute([100n], {
        value: parseEther("1"), // Only 1 ETH contributed, softCap is 5 ETH
        account: otherAccount.account!,
      });

      // Verify that contribution was made successfully
      const ethContribution = await presale.read.ethContributions([
        otherAccount.account!.address,
      ]);
      assert.equal(ethContribution, parseEther("1"));

      // Increase time to after end time
      await networkHelpers.time.increase(65n); // Increase by 65 seconds to ensure endTime is passed

      // Check that the presale status is now failed
      const hasFailed = await presale.read.presaleFailed();
      assert.equal(hasFailed, true);

      // Check that user can withdraw their contribution
      const initialBalance = await publicClient.getBalance({
        address: otherAccount.account!.address,
      });
      const tx = await presale.write.refund({ account: otherAccount.account! });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
      const finalBalance = await publicClient.getBalance({
        address: otherAccount.account!.address,
      });

      // Check that user got their contribution back (accounting for gas)
      assert.ok(finalBalance > initialBalance - gasUsed);
    });

    it("Should fail presale if endTime is reached without reaching softCap", async function () {
      // Get the latest timestamp from the blockchain
      const latestBlock = await publicClient.getBlock();
      const currentTime = latestBlock.timestamp;
      const endTime = currentTime + 60n; // 60 seconds in the future

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"),
            softCap: parseEther("5"), // Setting softCap to 5 ETH
            startTime: currentTime,
            endTime: endTime,
            softCapPrice: parseEther("0.015"), // Higher price for soft cap failure scenario
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

      // Contribute less than the softCap before the end time (should work)
      await presale.write.contribute([100n], {
        value: parseEther("1"), // Only 1 ETH contributed, softCap is 5 ETH
        account: otherAccount.account!,
      });

      // Verify that contribution was made successfully
      const ethContribution = await presale.read.ethContributions([
        otherAccount.account!.address,
      ]);
      assert.equal(ethContribution, parseEther("1"));

      // Now increase time to after end time
      await networkHelpers.time.increase(65n); // Increase by 65 seconds to ensure endTime is passed

      // Check that the presale status is now failed
      const hasFailed = await presale.read.presaleFailed();
      assert.equal(hasFailed, true);
    });

    it("Should not allow claiming tokens when presale has failed", async function () {
      // Get the latest timestamp from the blockchain
      const latestBlock = await publicClient.getBlock();
      const currentTime = latestBlock.timestamp;
      const endTime = currentTime + 60n; // 60 seconds in the future

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"),
            softCap: parseEther("5"), // Setting softCap to 5 ETH
            startTime: currentTime,
            endTime: endTime,
            softCapPrice: parseEther("0.015"), // Higher price for soft cap failure scenario
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

      // Contribute less than the softCap before the end time (should work)
      await presale.write.contribute([100n], {
        value: parseEther("1"), // Only 1 ETH contributed, softCap is 5 ETH
        account: otherAccount.account!,
      });

      // Verify that contribution was made successfully
      const ethContribution = await presale.read.ethContributions([
        otherAccount.account!.address,
      ]);
      assert.equal(ethContribution, parseEther("1"));

      // Now increase time to after end time to make the presale fail
      await networkHelpers.time.increase(65n); // Increase by 65 seconds to ensure endTime is passed

      // Check that the presale status is now failed
      const hasFailed = await presale.read.presaleFailed();
      assert.equal(hasFailed, true);

      // Try to claim tokens - should fail since presale has failed
      await viem.assertions.revertWithCustomError(
        presale.write.claimTokens({ account: otherAccount.account! }),
        presale,
        "PresaleFailed"
      );
    });

    it("Should not allow contributions when presale has failed", async function () {
      // Get the latest timestamp from the blockchain
      const latestBlock = await publicClient.getBlock();
      const currentTime = latestBlock.timestamp;
      const endTime = currentTime + 60n; // 60 seconds in the future

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"),
            softCap: parseEther("5"), // Setting softCap to 5 ETH
            startTime: currentTime,
            endTime: endTime,
            softCapPrice: parseEther("0.015"), // Higher price for soft cap failure scenario
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

      // Contribute less than the softCap before the end time (should work)
      await presale.write.contribute([100n], {
        value: parseEther("1"), // Only 1 ETH contributed, softCap is 5 ETH
        account: otherAccount.account!,
      });

      // Verify that contribution was made successfully
      const ethContribution = await presale.read.ethContributions([
        otherAccount.account!.address,
      ]);
      assert.equal(ethContribution, parseEther("1"));

      // Now increase time to after end time to make the presale fail
      await networkHelpers.time.increase(65n); // Increase by 65 seconds to ensure endTime is passed

      // Check that the presale status is now failed
      const hasFailed = await presale.read.presaleFailed();
      assert.equal(hasFailed, true);

      // Try to contribute again - should fail since presale has failed
      await viem.assertions.revertWithCustomError(
        presale.write.contribute([100n], {
          value: parseEther("1"),
          account: otherAccount.account!,
        }),
        presale,
        "PresaleFailedNoRefund"
      );
    });
  });
});
