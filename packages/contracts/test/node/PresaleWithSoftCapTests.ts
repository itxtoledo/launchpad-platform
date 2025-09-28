import { beforeEach, describe, it } from "node:test";
import { expect } from "chai";
import hre from "hardhat";
import {
  GetContractReturnType,
  parseEther,
  PublicClient,
  WalletClient,
} from "viem";

const { viem, networkHelpers } = await hre.network.connect();
const time = networkHelpers.time;

describe("Presale Enhanced Tests", function () {
  let presaleFactory: GetContractReturnType;
  let owner: WalletClient;
  let otherAccount: WalletClient;
  let publicClient: PublicClient;

  beforeEach(async function () {
    const presale = await viem.deployContract("Presale");
    const token = await viem.deployContract("MintableERC20");
    const [ownerClient, otherAccountClient] = await viem.getWalletClients();

  describe("Soft Cap with Time Limit Requirements", function () {
    it("Should revert if softcap is set but no time limit", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));

      await expect(
        presaleFactory.write.createPresale(
          [
            {
              name: "Example",
              symbol: "EXM",
              supply: 1000n,
              price: parseEther("1"),
              hardCap: parseEther("10"), // hardCap
              softCap: parseEther("5"), // softCap
              startTime: currentTime, // startTime
              endTime: 0n, // endTime (no time limit)
              softCapPrice: parseEther("1"), // softCapPrice
            },
          ],
          { value: parseEther("0.01") }
        )
      ).to.be.rejectedWith("SoftCapRequiresTimeLimit");
    });

    it("Should prevent new contributions after time limit if softcap not reached", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const startTime = currentTime + 5n; // start in 5 seconds
      const endTime = startTime + 30n; // end 30 seconds after start (35 seconds from now)

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("1"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          startTime, // startTime
          endTime, // endTime
          parseEther("1"), // softCapPrice
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presale = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: otherAccount },
        }
      );

      // Advance time to just after start time so presale begins
      await time.increaseTo(startTime + 1n);

      // Contribute less than soft cap
      await presale.write.contribute([2n], { value: parseEther("2") });

      // Advance time past the end time
      await time.increaseTo(endTime + 1n);

      // Try to contribute again - should fail
      await expect(
        presale.write.contribute([1n], { value: parseEther("1") })
      ).to.be.rejectedWith("PresaleFailedNoRefund");
    });

    it("Should allow refund for all contributors when time limit reached and softcap not met", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const startTime = currentTime + 5n; // start in 5 seconds
      const endTime = startTime + 30n; // end 30 seconds after start

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("1"),
            hardCap: parseEther("10"), // hardCap
            softCap: parseEther("5"), // softCap
            startTime: startTime, // startTime
            endTime: endTime, // endTime
            softCapPrice: parseEther("1"), // softCapPrice
          },
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presale = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: otherAccount },
        }
      );

      // Advance time to just after start time so presale begins
      await time.increaseTo(startTime + 1n);

      // Contribute less than soft cap (2 ETH instead of 5 ETH needed)
      await presale.write.contribute([2n], { value: parseEther("2") });

      // Advance time past the end time
      await time.increaseTo(endTime + 1n);

      // Should be able to get refund since time is up and softcap not met
      const initialBalance = await publicClient.getBalance({
        address: otherAccount.account.address,
      });
      const tx = await presale.write.refund();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
      const finalBalance = await publicClient.getBalance({
        address: otherAccount.account.address,
      });

      const expectedBalance = initialBalance - gasUsed + parseEther("2");
      expect(
        finalBalance >= expectedBalance - parseEther("0.001") &&
          finalBalance <= expectedBalance + parseEther("0.001")
      ).to.be.true;
    });

    it("Should return true for presaleFailed when time is up and softcap not met", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const startTime = currentTime + 5n; // start in 5 seconds
      const endTime = startTime + 30n; // end 30 seconds after start

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("1"),
            hardCap: parseEther("10"), // hardCap
            softCap: parseEther("5"), // softCap
            startTime: startTime, // startTime
            endTime: endTime, // endTime
            softCapPrice: parseEther("1"), // softCapPrice
          },
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presale = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: otherAccount },
        }
      );

      // Advance time to just after start time so presale begins
      await time.increaseTo(startTime + 1n);

      // Contribute less than soft cap
      await presale.write.contribute([2n], { value: parseEther("2") });

      // Before end time, should not be failed
      let isFailed = await presale.read.presaleFailed();
      expect(isFailed).to.be.false;

      // Advance time past the end time
      await time.increaseTo(endTime + 1n);

      // After end time and before softcap reached, should be failed
      isFailed = await presale.read.presaleFailed();
      expect(isFailed).to.be.true;
    });
  });
});
