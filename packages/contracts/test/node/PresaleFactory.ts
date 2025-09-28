import { beforeEach, describe, it } from "node:test";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther, PublicClient, WalletClient } from "viem";
import { ContractReturnType } from "@nomicfoundation/hardhat-viem/types";
const { viem, networkHelpers } = await hre.network.connect();

const time = networkHelpers.time;

describe("PresaleFactory", function () {
  let presaleFactory: ContractReturnType<"PresaleFactory">;
  let presale: ContractReturnType<"Presale">;
  let token: ContractReturnType<"MintableERC20">;
  let owner: WalletClient;
  let otherAccount: WalletClient;
  let publicClient: PublicClient;
  let initialFee: bigint;

  beforeEach(async function () {
    presale = await viem.deployContract("Presale");
    token = await viem.deployContract("MintableERC20");
    const [ownerClient, otherAccountClient] = await viem.getWalletClients();
    owner = ownerClient;
    otherAccount = otherAccountClient;

    initialFee = parseEther("0.01"); // Example: 0.01 ETH

    presaleFactory = await viem.deployContract("PresaleFactory", [
      presale.address,
      token.address,
      initialFee,
      owner.account!.address,
    ]);

    publicClient = await viem.getPublicClient();
  });

  describe("Initialization", function () {
    it("should initialize with correct presale and token addresses", async function () {
      const factoryPresaleAddress = await presaleFactory.read.presale();
      const factoryTokenAddress = await presaleFactory.read.token();

      // Convert both addresses to lowercase for comparison (to handle case sensitivity)
      const expectedPresaleAddress = presale.address.toLowerCase();
      const expectedTokenAddress = token.address.toLowerCase();

      expect(factoryPresaleAddress.toLowerCase()).to.equal(
        expectedPresaleAddress
      );
      expect(factoryTokenAddress.toLowerCase()).to.equal(expectedTokenAddress);
    });

    it("should initialize with the correct owner", async function () {
      expect((await presaleFactory.read.owner()).toLowerCase()).to.equal(
        owner.account!.address.toLowerCase()
      );
    });

    it("should initialize with the correct presale creation fee", async function () {
      expect(await presaleFactory.read.presaleCreationFee()).to.equal(
        initialFee
      );
    });
  });

  describe("Presale Creation and Pagination", function () {
    it("Should create a presale and return it in paginated results", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour from now

      const initialOwnerBalance = await publicClient.getBalance({
        address: owner.account!.address,
      });
      const initialFactoryBalance = await publicClient.getBalance({
        address: presaleFactory.address,
      }); // Get factory balance before transaction

      const hash = await presaleFactory.write.createPresale(
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            endTime: futureTime,
            hardCap: parseEther("10"), // hardCap
            startTime: currentTime, // startTime
            softCapPrice: parseEther("0.01"), // softCapPrice
            softCap: parseEther("5"), // soft
            price: parseEther("0.01"), // softCapPrice
          },
        ],
        { value: initialFee } // Pass the fee
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const finalOwnerBalance = await publicClient.getBalance({
        address: owner.account!.address,
      });
      expect(finalOwnerBalance < initialOwnerBalance).to.be.true; // Owner paid the fee

      const finalFactoryBalance = await publicClient.getBalance({
        address: presaleFactory.address,
      });
      expect(finalFactoryBalance).to.equal(initialFactoryBalance + initialFee); // Fee should be transferred to the factory

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      expect(presaleEvents).to.have.lengthOf(1);
      const createdPresaleAddress = presaleEvents[0].args.presale;

      const paginatedPresales = await presaleFactory.read.getPaginatedPresales([
        1n,
      ]);
      expect(paginatedPresales).to.have.lengthOf(1);
      expect(paginatedPresales[0]).to.equal(createdPresaleAddress);
    });

    it("Should revert if incorrect fee is provided", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour from now

      await viem.assertions.revertWithCustomErrorWithArgs(
        presaleFactory.write.createPresale(
          [{
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"), // hardCap
            softCap: parseEther("5"), // softCap
            startTime: currentTime, // startTime
            endTime: futureTime, // endTime
            softCapPrice: parseEther("0.01"), // softCapPrice
          }],
          { value: initialFee - 1n } // Incorrect fee
        ),
        presaleFactory,
        "IncorrectPresaleCreationFee",
        [initialFee - 1n, initialFee]
      );
    });

    it("Should return empty array for out of bounds page", async function () {
      const paginatedPresales = await presaleFactory.read.getPaginatedPresales([
        2n,
      ]);
      expect(paginatedPresales).to.have.lengthOf(0);
    });

    it("Should return multiple presales in paginated results", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour from now

      for (let i = 0; i < 12n; i++) {
        const hash = await presaleFactory.write.createPresale(
          [{
            name: `Example${i}`,
            symbol: `EXM${i}`,
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"), // hardCap
            softCap: parseEther("5"), // softCap
            startTime: currentTime, // startTime
            endTime: futureTime, // endTime
            softCapPrice: parseEther("0.01"), // softCapPrice
          }],
          { value: initialFee } // Pass the fee
        );
        await publicClient.waitForTransactionReceipt({ hash });
      }

      const page1 = await presaleFactory.read.getPaginatedPresales([1n]);
      expect(page1).to.have.lengthOf(10);

      const page2 = await presaleFactory.read.getPaginatedPresales([2n]);
      expect(page2).to.have.lengthOf(2);
    });

    it("Should allow owner to set new presale creation fee", async function () {
      const newFee = parseEther("0.02");
      await presaleFactory.write.setPresaleCreationFee([newFee], {
        account: owner.account,
      });
      expect(await presaleFactory.read.presaleCreationFee()).to.equal(newFee);
    });

    it("Should revert if non-owner tries to set new presale creation fee", async function () {
      const newFee = parseEther("0.02");
      await viem.assertions.revertWithCustomError(
        presaleFactory.write.setPresaleCreationFee([newFee], {
          account: otherAccount.account,
        }),
        presaleFactory,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should allow owner to withdraw fees from the factory", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour from now

      // Create a presale to deposit fees into the factory
      const hash = await presaleFactory.write.createPresale(
        [{
          name: "Example",
          symbol: "EXM",
          supply: 1000n,
          price: parseEther("0.01"),
          hardCap: parseEther("10"), // hardCap
          softCap: parseEther("5"), // softCap
          startTime: currentTime, // startTime
          endTime: futureTime, // endTime
          softCapPrice: parseEther("0.01"), // softCapPrice
        }],
        { value: initialFee } // Pass the fee
      );
      await publicClient.waitForTransactionReceipt({ hash });

      const initialFactoryBalance = await publicClient.getBalance({
        address: presaleFactory.address,
      });
      const initialOwnerBalance = await publicClient.getBalance({
        address: owner.account!.address,
      });

      // Owner withdraws fees
      const withdrawHash = await presaleFactory.write.withdrawFees({
        account: owner.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

      const finalFactoryBalance = await publicClient.getBalance({
        address: presaleFactory.address,
      });
      const finalOwnerBalance = await publicClient.getBalance({
        address: owner.account!.address,
      });

      expect(finalFactoryBalance).to.equal(0n); // Factory balance should be 0 after withdrawal
      expect(finalOwnerBalance > initialOwnerBalance).to.be.true; // Owner's balance should increase
    });

    it("Should revert if non-owner tries to withdraw fees", async function () {
      await viem.assertions.revertWithCustomError(
        presaleFactory.write.withdrawFees({ account: otherAccount.account }),
        presaleFactory,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  describe("Sales", function () {
    describe("Could buy tokens at presale", function () {
      it("Should buy tokens", async function () {
        const latestBlock = await publicClient.getBlock();
        const startTime = latestBlock.timestamp + 1n;
        const futureTime = startTime + 3600n; // 1 hour from now

        const hash = await presaleFactory.write.createPresale(
          [{
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("1"),
            hardCap: parseEther("10"), // hardCap
            softCap: parseEther("5"), // softCap
            startTime: startTime, // startTime
            endTime: futureTime, // endTime
            softCapPrice: parseEther("1"), // softCapPrice
          }],
          { value: initialFee } // Pass the fee
        );

        await publicClient.waitForTransactionReceipt({ hash });

        await time.increase(1n);

        const presaleCreatedEvents =
          await presaleFactory.getEvents.PresaleCreated(
            {},
            {
              fromBlock: (await publicClient.getBlockNumber()) - 1n,
            }
          );
        const presaleAddress = presaleCreatedEvents[0].args.presale!;

        const presale = await viem.getContractAt(
          "Presale",
          presaleAddress as `0x${string}`,
          {
            client: { wallet: otherAccount },
          }
        );

        const AMOUNT_TO_BUY = 6n;

        await presale.write.contribute([AMOUNT_TO_BUY], {
          value: parseEther("6"),
        });
      });
    });

    describe("Events", function () {
      it("Should emit an event on new Presale creation", async function () {
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const futureTime = currentTime + 3600n; // 1 hour from now

        const hash = await presaleFactory.write.createPresale(
          [{
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: 1n,
            hardCap: parseEther("10"), // hardCap
            softCap: parseEther("5"), // softCap
            startTime: currentTime, // startTime
            endTime: futureTime, // endTime
            softCapPrice: 1n, // softCapPrice
          }],
          { value: initialFee } // Pass the fee
        );
        await publicClient.waitForTransactionReceipt({ hash });

        // get the PresaleCreated events in the latest block
        const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
        expect(presaleEvents).to.have.lengthOf(1);
        expect(presaleEvents[0].args.presale).to.be.an("string");
      });
    });
  });
});
