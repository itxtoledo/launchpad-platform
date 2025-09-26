import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

describe("Presale", function () {
  async function deployPresale() {
    const presale = await hre.viem.deployContract("Presale");
    const token = await hre.viem.deployContract("MintableERC20");

    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const initialFee = parseEther("0.01");

    const presaleFactory = await hre.viem.deployContract("PresaleFactory", [
      presale.address,
      token.address,
      initialFee,
    ]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      presaleFactory,
      presale,
      token,
      owner,
      otherAccount,
      publicClient,
    };
  }

  describe("Soft Cap Logic", function () {
    it("Should not allow token claim before soft cap is reached", async function () {
      const { presaleFactory, publicClient, otherAccount } = await loadFixture(
        deployPresale
      );

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

      const presale = await hre.viem.getContractAt(
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
      const { presaleFactory, publicClient, owner } = await loadFixture(
        deployPresale
      );

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

      const presale = await hre.viem.getContractAt(
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
      const { presaleFactory, publicClient, otherAccount } = await loadFixture(
        deployPresale
      );

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

      const presale = await hre.viem.getContractAt(
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
      const { presaleFactory, publicClient, otherAccount } = await loadFixture(
        deployPresale
      );

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

      const presale = await hre.viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: otherAccount },
        }
      );

      await presale.write.contribute([6n], { value: parseEther("6") });

      const clonedTokenAddress = await presale.read.token();
      const clonedToken = await hre.viem.getContractAt(
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
      const { presaleFactory, publicClient, owner, otherAccount } =
        await loadFixture(deployPresale);

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

      const presaleForOther = await hre.viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: otherAccount },
        }
      );

      await presaleForOther.write.contribute([6n], { value: parseEther("6") });

      const presaleForOwner = await hre.viem.getContractAt(
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
      const { presaleFactory, publicClient, otherAccount } = await loadFixture(
        deployPresale
      );

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

      const presale = await hre.viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: otherAccount },
        }
      );

      await presale.write.contribute([1n], { value: parseEther("1") });

      // Increase time to after the presale ends
      await time.increaseTo(futureTime + 1n);

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
      const { presaleFactory, publicClient, otherAccount } = await loadFixture(
        deployPresale
      );

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

      const presale = await hre.viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: otherAccount },
        }
      );

      await presale.write.contribute([6n], { value: parseEther("6") });

      await time.increaseTo(futureTime + 1n);

      await expect(presale.write.refund()).to.be.rejectedWith(
        "SoftCapAlreadyReached"
      );
    });

    it("Should not allow token claim if soft cap is not reached", async function () {
      const { presaleFactory, publicClient, otherAccount } = await loadFixture(
        deployPresale
      );

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

      const presale = await hre.viem.getContractAt(
        "Presale",
        presaleAddress as `0x${string}`,
        {
          client: { wallet: otherAccount },
        }
      );

      await presale.write.contribute([1n], { value: parseEther("1") });

      await time.increaseTo(futureTime + 1n);

      await expect(presale.write.claimTokens()).to.be.rejectedWith(
        "SoftCapNotReached"
      );
    });

    it("Should revert if softCap is set and softCapPrice is 0", async function () {
      const { presaleFactory, publicClient, otherAccount } = await loadFixture(
        deployPresale
      );

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
      const { presaleFactory, publicClient, otherAccount } = await loadFixture(
        deployPresale
      );

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
      const { presaleFactory, publicClient, otherAccount } = await loadFixture(
        deployPresale
      );

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

      const presale = await hre.viem.getContractAt(
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
