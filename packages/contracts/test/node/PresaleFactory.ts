import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import hre from "hardhat";
import { parseEther, type PublicClient, type WalletClient } from "viem";
import { type ContractReturnType } from "@nomicfoundation/hardhat-viem/types";

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

      assert.equal(factoryPresaleAddress.toLowerCase(), expectedPresaleAddress);
      assert.equal(factoryTokenAddress.toLowerCase(), expectedTokenAddress);
    });

    it("should initialize with the correct owner", async function () {
      assert.equal(
        (await presaleFactory.read.owner()).toLowerCase(),
        owner.account!.address.toLowerCase()
      );
    });

    it("should initialize with the correct presale creation fee", async function () {
      assert.equal(await presaleFactory.read.presaleCreationFee(), initialFee);
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
      assert.ok(finalOwnerBalance < initialOwnerBalance); // Owner paid the fee

      const finalFactoryBalance = await publicClient.getBalance({
        address: presaleFactory.address,
      });
      assert.equal(finalFactoryBalance, initialFactoryBalance + initialFee); // Fee should be transferred to the factory

      const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
      assert.equal(presaleEvents.length, 1);
      const createdPresaleAddress = presaleEvents[0].args.presale;

      const paginatedPresales = await presaleFactory.read.getPaginatedPresales([
        1n,
      ]);
      assert.equal(paginatedPresales.length, 1);
      assert.equal(paginatedPresales[0], createdPresaleAddress);
    });

    it("Should revert if incorrect fee is provided", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour from now

      await viem.assertions.revertWithCustomErrorWithArgs(
        presaleFactory.write.createPresale(
          [
            {
              name: "Example",
              symbol: "EXM",
              supply: 1000n,
              price: parseEther("0.01"),
              hardCap: parseEther("10"), // hardCap
              softCap: parseEther("5"), // softCap
              startTime: currentTime, // startTime
              endTime: futureTime, // endTime
              softCapPrice: parseEther("0.01"), // softCapPrice
            },
          ],
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
      assert.equal(paginatedPresales.length, 0);
    });

    it("Should return multiple presales in paginated results", async function () {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const futureTime = currentTime + 3600n; // 1 hour from now

      for (let i = 0; i < 12n; i++) {
        const hash = await presaleFactory.write.createPresale(
          [
            {
              name: `Example${i}`,
              symbol: `EXM${i}`,
              supply: 1000n,
              price: parseEther("0.01"),
              hardCap: parseEther("10"), // hardCap
              softCap: parseEther("5"), // softCap
              startTime: currentTime, // startTime
              endTime: futureTime, // endTime
              softCapPrice: parseEther("0.01"), // softCapPrice
            },
          ],
          { value: initialFee } // Pass the fee
        );
        await publicClient.waitForTransactionReceipt({ hash });
      }

      const page1 = await presaleFactory.read.getPaginatedPresales([1n]);
      assert.equal(page1.length, 10);

      const page2 = await presaleFactory.read.getPaginatedPresales([2n]);
      assert.equal(page2.length, 2);
    });

    it("Should allow owner to set new presale creation fee", async function () {
      const newFee = parseEther("0.02");
      await presaleFactory.write.setPresaleCreationFee([newFee], {
        account: owner.account,
      });
      assert.equal(await presaleFactory.read.presaleCreationFee(), newFee);
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
        [
          {
            name: "Example",
            symbol: "EXM",
            supply: 1000n,
            price: parseEther("0.01"),
            hardCap: parseEther("10"), // hardCap
            softCap: parseEther("5"), // softCap
            startTime: currentTime, // startTime
            endTime: futureTime, // endTime
            softCapPrice: parseEther("0.01"), // softCapPrice
          },
        ],
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

      assert.equal(finalFactoryBalance, 0n); // Factory balance should be 0 after withdrawal
      assert.ok(finalOwnerBalance > initialOwnerBalance); // Owner's balance should increase
    });

    it("Should revert if non-owner tries to withdraw fees", async function () {
      await viem.assertions.revertWithCustomError(
        presaleFactory.write.withdrawFees({ account: otherAccount.account }),
        presaleFactory,
        "OwnableUnauthorizedAccount"
      );
    });

    describe("Pagination", function () {
      it("Should return empty array when no presales exist for getPaginatedPresales", async function () {
        const paginatedPresales = await presaleFactory.read.getPaginatedPresales([1n]);
        assert.equal(paginatedPresales.length, 0);
      });

      it("Should return empty array for page 0 in getPaginatedPresales", async function () {
        const paginatedPresales = await presaleFactory.read.getPaginatedPresales([0n]);
        assert.equal(paginatedPresales.length, 0);
      });

      it("Should return empty array for out of bounds page in getPaginatedPresales", async function () {
        // Create one presale first
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const futureTime = currentTime + 3600n; // 1 hour from now

        await presaleFactory.write.createPresale(
          [
            {
              name: "Example",
              symbol: "EXM",
              supply: 1000n,
              price: parseEther("0.01"),
              hardCap: parseEther("10"), // hardCap
              softCap: parseEther("5"), // softCap
              startTime: currentTime, // startTime
              endTime: futureTime, // endTime
              softCapPrice: parseEther("0.01"), // softCapPrice
            },
          ],
          { value: initialFee } // Pass the fee
        );

        const paginatedPresales = await presaleFactory.read.getPaginatedPresales([2n]);
        assert.equal(paginatedPresales.length, 0);
      });

      it("Should return correct presales in order for getPaginatedPresales", async function () {
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const futureTime = currentTime + 3600n; // 1 hour from now

        // Create multiple presales to test pagination
        const presaleAddresses = [];
        for (let i = 0; i < 15; i++) {
          const hash = await presaleFactory.write.createPresale(
            [
              {
                name: `Example${i}`,
                symbol: `EXM${i}`,
                supply: 1000n,
                price: parseEther("0.01"),
                hardCap: parseEther("10"), // hardCap
                softCap: parseEther("5"), // softCap
                startTime: currentTime, // startTime
                endTime: futureTime, // endTime
                softCapPrice: parseEther("0.01"), // softCapPrice
              },
            ],
            { value: initialFee } // Pass the fee
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          
          // Get the presale address from the event
          const events = await presaleFactory.getEvents.PresaleCreated({}, { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber });
          if (events.length > 0) {
            presaleAddresses.push(events[0].args.presale);
          }
        }

        // Test first page (should have 10 presales)
        const page1 = await presaleFactory.read.getPaginatedPresales([1n]);
        assert.equal(page1.length, 10);

        // Test second page (should have 5 presales)
        const page2 = await presaleFactory.read.getPaginatedPresales([2n]);
        assert.equal(page2.length, 5);

        // Verify correct addresses are returned in order
        for (let i = 0; i < 10; i++) {
          assert.equal(page1[i], presaleAddresses[i]);
        }
        for (let i = 0; i < 5; i++) {
          assert.equal(page2[i], presaleAddresses[10 + i]);
        }
      });

      it("Should return empty array when no presales exist for getPaginatedPresalesDecreasingByCreation", async function () {
        const paginatedPresales = await presaleFactory.read.getPaginatedPresalesDecreasingByCreation([1n, 10n]);
        assert.equal(paginatedPresales.length, 0);
      });

      it("Should return empty array for page 0 in getPaginatedPresalesDecreasingByCreation", async function () {
        const paginatedPresales = await presaleFactory.read.getPaginatedPresalesDecreasingByCreation([0n, 10n]);
        assert.equal(paginatedPresales.length, 0);
      });

      it("Should return empty array for out of bounds page in getPaginatedPresalesDecreasingByCreation", async function () {
        // Create one presale first
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const futureTime = currentTime + 3600n; // 1 hour from now

        await presaleFactory.write.createPresale(
          [
            {
              name: "Example",
              symbol: "EXM",
              supply: 1000n,
              price: parseEther("0.01"),
              hardCap: parseEther("10"), // hardCap
              softCap: parseEther("5"), // softCap
              startTime: currentTime, // startTime
              endTime: futureTime, // endTime
              softCapPrice: parseEther("0.01"), // softCapPrice
            },
          ],
          { value: initialFee } // Pass the fee
        );

        const paginatedPresales = await presaleFactory.read.getPaginatedPresalesDecreasingByCreation([2n, 10n]);
        assert.equal(paginatedPresales.length, 0);
      });

      it("Should return presales in reverse chronological order for getPaginatedPresalesDecreasingByCreation", async function () {
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const futureTime = currentTime + 3600n; // 1 hour from now

        // Create multiple presales to test pagination
        const presaleAddresses = [];
        for (let i = 0; i < 15; i++) {
          const hash = await presaleFactory.write.createPresale(
            [
              {
                name: `Example${i}`,
                symbol: `EXM${i}`,
                supply: 1000n,
                price: parseEther("0.01"),
                hardCap: parseEther("10"), // hardCap
                softCap: parseEther("5"), // softCap
                startTime: currentTime, // startTime
                endTime: futureTime, // endTime
                softCapPrice: parseEther("0.01"), // softCapPrice
              },
            ],
            { value: initialFee } // Pass the fee
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          
          // Get the presale address from the event
          const events = await presaleFactory.getEvents.PresaleCreated({}, { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber });
          if (events.length > 0) {
            presaleAddresses.push(events[0].args.presale);
          }
        }

        // Test first page with decreasing order (should return the last 10 presales in reverse order)
        const page1 = await presaleFactory.read.getPaginatedPresalesDecreasingByCreation([1n, 10n]);
        assert.equal(page1.length, 10);

        // Test second page (should return the first 5 presales in reverse order)
        const page2 = await presaleFactory.read.getPaginatedPresalesDecreasingByCreation([2n, 10n]);
        assert.equal(page2.length, 5);

        // Verify the addresses are returned in decreasing order (most recent first)
        for (let i = 0; i < 10; i++) {
          // The most recent presale (at index 14) should be first on page 1, then index 13, etc.
          assert.equal(page1[i], presaleAddresses[14 - i]);
        }
        for (let i = 0; i < 5; i++) {
          // The next 5 presales (at indices 4-0) should be on page 2
          assert.equal(page2[i], presaleAddresses[4 - i]);
        }
      });

      it("Should handle different page sizes correctly for getPaginatedPresalesDecreasingByCreation", async function () {
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const futureTime = currentTime + 3600n; // 1 hour from now

        // Create multiple presales
        const presaleAddresses = [];
        for (let i = 0; i < 12; i++) {
          const hash = await presaleFactory.write.createPresale(
            [
              {
                name: `Example${i}`,
                symbol: `EXM${i}`,
                supply: 1000n,
                price: parseEther("0.01"),
                hardCap: parseEther("10"), // hardCap
                softCap: parseEther("5"), // softCap
                startTime: currentTime, // startTime
                endTime: futureTime, // endTime
                softCapPrice: parseEther("0.01"), // softCapPrice
              },
            ],
            { value: initialFee } // Pass the fee
          );
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          
          // Get the presale address from the event
          const events = await presaleFactory.getEvents.PresaleCreated({}, { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber });
          if (events.length > 0) {
            presaleAddresses.push(events[0].args.presale);
          }
        }

        // Test with page size 5, first page (should return 5 most recent)
        const page1 = await presaleFactory.read.getPaginatedPresalesDecreasingByCreation([1n, 5n]);
        assert.equal(page1.length, 5);

        // Test with page size 5, second page (should return next 5)
        const page2 = await presaleFactory.read.getPaginatedPresalesDecreasingByCreation([2n, 5n]);
        assert.equal(page2.length, 5);

        // Test with page size 5, third page (should return last 2)
        const page3 = await presaleFactory.read.getPaginatedPresalesDecreasingByCreation([3n, 5n]);
        assert.equal(page3.length, 2);

        // Verify order is correct (most recent first)
        assert.equal(page1[0], presaleAddresses[11]); // Most recent
        assert.equal(page1[4], presaleAddresses[7]);  // Fifth most recent
        assert.equal(page2[0], presaleAddresses[6]);  // Sixth most recent
        assert.equal(page2[4], presaleAddresses[2]);  // Tenth most recent
        assert.equal(page3[0], presaleAddresses[1]);  // Eleventh most recent
        assert.equal(page3[1], presaleAddresses[0]);  // Last/oldest
      });

      it("Should return empty array if page size is too large but skip exceeds total count", async function () {
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const futureTime = currentTime + 3600n; // 1 hour from now

        // Create only 3 presales
        for (let i = 0; i < 3; i++) {
          await presaleFactory.write.createPresale(
            [
              {
                name: `Example${i}`,
                symbol: `EXM${i}`,
                supply: 1000n,
                price: parseEther("0.01"),
                hardCap: parseEther("10"), // hardCap
                softCap: parseEther("5"), // softCap
                startTime: currentTime, // startTime
                endTime: futureTime, // endTime
                softCapPrice: parseEther("0.01"), // softCapPrice
              },
            ],
            { value: initialFee } // Pass the fee
          );
        }

        // Try to access page 2 with page size 5 (skip = (2-1) * 5 = 5, but only 3 total)
        const paginatedPresales = await presaleFactory.read.getPaginatedPresalesDecreasingByCreation([2n, 5n]);
        assert.equal(paginatedPresales.length, 0);
      });
    });
  });

  describe("Sales", function () {
    describe("Could buy tokens at presale", function () {
      it("Should buy tokens", async function () {
        const latestBlock = await publicClient.getBlock();
        const startTime = latestBlock.timestamp + 1n;
        const futureTime = startTime + 3600n; // 1 hour from now

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
              endTime: futureTime, // endTime
              softCapPrice: parseEther("1"), // softCapPrice
            },
          ],
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
          presaleAddress as `0x${string}`
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
          [
            {
              name: "Example",
              symbol: "EXM",
              supply: 1000n,
              price: 1n,
              hardCap: parseEther("10"), // hardCap
              softCap: parseEther("5"), // softCap
              startTime: currentTime, // startTime
              endTime: futureTime, // endTime
              softCapPrice: 1n, // softCapPrice
            },
          ],
          { value: initialFee } // Pass the fee
        );
        await publicClient.waitForTransactionReceipt({ hash });

        // get the PresaleCreated events in the latest block
        const presaleEvents = await presaleFactory.getEvents.PresaleCreated();
        assert.equal(presaleEvents.length, 1);
        assert.equal(typeof presaleEvents[0].args.presale, "string");
      });
    });
  });
});
