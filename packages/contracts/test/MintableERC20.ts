import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { parseEther } from "viem";

describe("MintableERC20", function () {
  async function deployToken() {
    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const presale = await hre.viem.deployContract("Presale");
    const tokenImplementation = await hre.viem.deployContract("MintableERC20");

    const initialFee = parseEther("0.01");

    const presaleFactory = await hre.viem.deployContract("PresaleFactory", [
      presale.address,
      tokenImplementation.address,
      initialFee,
    ]);

    const publicClient = await hre.viem.getPublicClient();

    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const futureTime = currentTime + 3600n;

    const hash = await presaleFactory.write.createPresale(
      [
        "Test Token",
        "TST",
        parseEther("1000"),
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

    const presaleContract = await hre.viem.getContractAt(
      "Presale",
      presaleAddress as `0x${string}`
    );

    const tokenAddress = await presaleContract.read.token();
    const token = await hre.viem.getContractAt("MintableERC20", tokenAddress);

    return {
      token,
      owner,
      otherAccount,
      presaleAddress: presaleAddress as `0x${string}`,
    };
  }

  it("should be deployed with the correct name and symbol", async function () {
    const { token } = await loadFixture(deployToken);

    expect(await token.read.name()).to.equal("Test Token");
    expect(await token.read.symbol()).to.equal("TST");
  });

  it("should mint initial supply to the deployer", async function () {
    const { token, owner } = await loadFixture(deployToken);

    const balance = await token.read.balanceOf([owner.account.address]);
    expect(balance).to.equal(parseEther("1000"));
  });

  it("should allow minter to mint new tokens", async function () {
    const { token, otherAccount, presaleAddress } = await loadFixture(
      deployToken
    );

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
    const { token, otherAccount } = await loadFixture(deployToken);

    await expect(
      token.write.mint([otherAccount.account.address, parseEther("500")], {
        account: otherAccount.account,
      })
    ).to.be.rejectedWith("AccessControlUnauthorizedAccount");
  });
});
