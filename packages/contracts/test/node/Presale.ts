import { beforeEach, describe, it } from "node:test";
import { expect } from "chai";
import { network } from "hardhat";
import {
  GetContractReturnType,
  parseEther,
  PublicClient,
  WalletClient,
} from "viem";
import hre from "hardhat";

const { viem } = await hre.network.connect();

describe("Presale", function () {
  let presaleFactory: GetContractReturnType;
  let owner: WalletClient;
  let otherAccount: WalletClient;
  let publicClient: PublicClient;
  let viem: any;
  let networkHelpers: any;

  beforeEach(async function () {
    const { viem: connectedViem, networkHelpers: connectedNetworkHelpers } =
      await network.connect();
    viem = connectedViem;
    networkHelpers = connectedNetworkHelpers;

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
      owner.account.address,
    ]);

    publicClient = await viem.getPublicClient();
  });

  describe("Soft Cap Logic", function () {
    it("Should not allow token claim before soft cap is reached", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("0.01"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime
          parseEther("0.01"), // softCapPrice
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

      await presale.write.contribute([1n], { value: parseEther("0.01") });

      await expect(presale.write.claimTokens()).to.be.rejectedWith(
        "SoftCapNotReached"
      );
    });

    it("Should not allow owner to withdraw ETH before soft cap is reached", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("0.01"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime
          parseEther("0.01"), // softCapPrice
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
          client: { wallet: owner },
        }
      );

      await expect(presale.write.withdrawETH()).to.be.rejectedWith(
        "SoftCapNotReached"
      );
    });

    it("Should set softCapReached to true when soft cap is met", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("1"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime
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

      await presale.write.contribute([5n], { value: parseEther("5") });

      const softCapReached = await presale.read.softCapReached();
      expect(softCapReached).to.be.true;
    });

    it("Should allow token claim after soft cap is reached", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("1"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime
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

      await presale.write.contribute([6n], { value: parseEther("6") });

      const clonedTokenAddress = await presale.read.token();
      const clonedToken = await viem.getContractAt(
        "MintableERC20",
        clonedTokenAddress
      );

      await presale.write.claimTokens();
      const balance = await clonedToken.read.balanceOf([
        otherAccount.account.address,
      ]);
      const expectedBalance = 6n * 10n ** 18n; // 6 tokens with 18 decimals
      expect(balance).to.equal(expectedBalance);
    });

    it("Should allow owner to withdraw ETH after soft cap is reached", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("1"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime
          parseEther("1"), // softCapPrice
        ],
        { value: parseEther("0.01") }
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      const presaleAddress = presaleEvents[0].args.presale;

      const presaleForOther = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: otherAccount },
        }
      );

      await presaleForOther.write.contribute([6n], { value: parseEther("6") });

      const presaleForOwner = await viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: owner },
        }
      );

      const initialOwnerBalance = await publicClient.getBalance({
        address: owner.account.address,
      });
      const tx = await presaleForOwner.write.withdrawETH();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
      const finalOwnerBalance = await publicClient.getBalance({
        address: owner.account.address,
      });

      expect(finalOwnerBalance > initialOwnerBalance - gasUsed).to.be.true;
    });

    it("Should allow user to get a refund if soft cap is not reached and presale ended", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 10n; // very short presale

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("1"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime,
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

      await presale.write.contribute([1n], { value: parseEther("1") });

      // Increase time to after the presale ends
      await networkHelpers.time.increaseTo(futureTime + 1n);

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

      const expectedBalance = initialBalance - gasUsed + parseEther("1");
      expect(
        finalBalance >= expectedBalance - parseEther("0.001") &&
          finalBalance <= expectedBalance + parseEther("0.001")
      ).to.be.true;
    });

    it("Should not allow refund if soft cap is reached", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("1"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime,
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

      await presale.write.contribute([6n], { value: parseEther("6") });

      await networkHelpers.time.increaseTo(futureTime + 1n);

      await expect(presale.write.refund()).to.be.rejectedWith(
        "SoftCapAlreadyReached"
      );
    });

    it("Should not allow token claim if soft cap is not reached and presale has ended (failed)", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("1"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime
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

      await presale.write.contribute([1n], { value: parseEther("1") });

      await networkHelpers.time.increaseTo(futureTime + 1n);

      await expect(presale.write.claimTokens()).to.be.rejectedWith(
        "PresaleFailed"
      );
    });

    it("Should revert with PresaleFailed error when trying to claim tokens in a failed presale", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 10n; // very short presale

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("1"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime,
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

      await presale.write.contribute([1n], { value: parseEther("1") });

      // Increase time to after the presale ends (without reaching soft cap)
      await networkHelpers.time.increaseTo(futureTime + 1n);

      // Check that presaleFailed() returns true
      const presaleFailed = await presale.read.presaleFailed();
      expect(presaleFailed).to.be.true;

      // Try to claim tokens - should revert with PresaleFailed error
      await expect(presale.write.claimTokens()).to.be.rejectedWith(
        "PresaleFailed"
      );
    });

    it("Should revert if softCap is set and softCapPrice is 0", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      await expect(
        presaleFactory.write.createPresale(
          [
            "Example",
            "EXM",
            1000n,
            parseEther("1"),
            parseEther("10"), // hardCap
            parseEther("5"), // softCap
            currentTime, // startTime
            futureTime, // endTime
            0n, // softCapPrice
          ],
          { value: parseEther("0.01") }
        )
      ).to.be.rejectedWith("InvalidSoftCapPrice");
    });

    it("Should revert if softCapPrice is less than price", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      await expect(
        presaleFactory.write.createPresale(
          [
            "Example",
            "EXM",
            1000n,
            parseEther("1"),
            parseEther("10"), // hardCap
            parseEther("5"), // softCap
            currentTime, // startTime
            futureTime, // endTime
            parseEther("0.5"), // softCapPrice
          ],
          { value: parseEther("0.01") }
        )
      ).to.be.rejectedWith("InvalidSoftCapPrice");
    });

    it("Should use softCapPrice when softCap is reached", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n;

      const hash = await presaleFactory.write.createPresale(
        [
          "Example",
          "EXM",
          1000n,
          parseEther("1"),
          parseEther("10"), // hardCap
          parseEther("5"), // softCap
          currentTime, // startTime
          futureTime, // endTime
          parseEther("2"), // softCapPrice
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

      // Contribute to reach soft cap
      await presale.write.contribute([5n], { value: parseEther("5") });

      // Contribute after soft cap is reached
      await presale.write.contribute([1n], { value: parseEther("2") });

      const tokenContributions = await presale.read.tokenContributions([
        otherAccount.account.address,
      ]);

      const expectedTokenContributions = 6n * 10n ** 18n; // 5 tokens at price 1 + 1 token at price 2
      expect(tokenContributions).to.equal(expectedTokenContributions);
    });
  });
});
