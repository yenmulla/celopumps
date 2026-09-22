const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Launchpad", function () {
  let LaunchpadFactory;
  let factory;
  let owner;
  let creator;
  let buyer;
  let tokenAddress;
  let token;

  const DEFAULT_TAX = 0; // 0%
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    [owner, creator, buyer] = await ethers.getSigners();

    LaunchpadFactory = await ethers.getContractFactory("LaunchpadFactory");
    factory = await LaunchpadFactory.deploy();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });
  });

  describe("Token Creation", function () {
    it("Should create a new token with advanced settings", async function () {
      const taxBps = 500; // 5%
      const tx = await factory.connect(creator).createToken("Test Token", "TEST", taxBps, creator.address, false);
      const receipt = await tx.wait();

      const event = receipt.logs.find(log => {
        try {
          return factory.interface.parseLog(log).name === 'TokenCreated';
        } catch (e) {
          return false;
        }
      });

      const parsedLog = factory.interface.parseLog(event);
      tokenAddress = parsedLog.args.token;

      token = await ethers.getContractAt("LaunchpadToken", tokenAddress);

      expect(await token.name()).to.equal("Test Token");
      expect(await token.symbol()).to.equal("TEST");

      const tokenInfo = await factory.tokens(tokenAddress);
      expect(tokenInfo.creatorTaxBps).to.equal(taxBps);
      expect(tokenInfo.creatorFeeWallet).to.equal(creator.address);
      expect(tokenInfo.holderFeeSharing).to.equal(false);
    });

    it("Should fail if tax is above 10%", async function () {
      await expect(
        factory.connect(creator).createToken("Scam", "SCAM", 1001, creator.address, false)
      ).to.be.revertedWith("Tax too high");
    });
  });

  describe("Advanced Trading Logic", function () {
    let creatorFeeWallet;

    beforeEach(async function () {
      [, creator, buyer, creatorFeeWallet] = await ethers.getSigners();
    });

    it("Should distribute 5% creator tax to specific wallet", async function () {
      const taxBps = 500; // 5%
      const tx = await factory.connect(creator).createToken("Taxed", "TAX", taxBps, creatorFeeWallet.address, false);
      const receipt = await tx.wait();
      tokenAddress = factory.interface.parseLog(receipt.logs[0]).args.token;

      const buyAmount = ethers.parseEther("10.0");
      const expectedProtocolFee = (buyAmount * 1n) / 100n; // 1%
      const expectedCreatorTax = (buyAmount * 5n) / 100n; // 5%

      const initialCreatorFeeBalance = await ethers.provider.getBalance(creatorFeeWallet.address);
      await factory.connect(buyer).buy(tokenAddress, { value: buyAmount });
      const finalCreatorFeeBalance = await ethers.provider.getBalance(creatorFeeWallet.address);

      expect(finalCreatorFeeBalance - initialCreatorFeeBalance).to.equal(expectedCreatorTax);
    });

    it("Should burn tokens when Holder Fee Sharing is enabled", async function () {
      const taxBps = 1000; // 10%
      const tx = await factory.connect(creator).createToken("Sharing", "SHARE", taxBps, ZERO_ADDRESS, true);
      const receipt = await tx.wait();
      tokenAddress = factory.interface.parseLog(receipt.logs[0]).args.token;
      token = await ethers.getContractAt("LaunchpadToken", tokenAddress);

      const buyAmount = ethers.parseEther("10.0");

      const initialDeadBalance = await token.balanceOf("0x000000000000000000000000000000000000dEaD");
      await factory.connect(buyer).buy(tokenAddress, { value: buyAmount });
      const finalDeadBalance = await token.balanceOf("0x000000000000000000000000000000000000dEaD");

      expect(finalDeadBalance).to.be.gt(initialDeadBalance);
    });
  });

  describe("Pricing & Curves", function () {
    beforeEach(async function () {
      const tx = await factory.connect(creator).createToken("Curve", "CURVE", 0, ZERO_ADDRESS, false);
      const receipt = await tx.wait();
      tokenAddress = factory.interface.parseLog(receipt.logs[0]).args.token;
    });

    it("Should scale pricing according to the bonding curve", async function () {
      const buyAmount = ethers.parseEther("10.0");

      await factory.connect(buyer).buy(tokenAddress, { value: buyAmount });
      const balance1 = await token.balanceOf(buyer.address);

      await factory.connect(buyer).buy(tokenAddress, { value: buyAmount });
      const balance2 = (await token.balanceOf(buyer.address)) - balance1;

      expect(balance2).to.be.lt(balance1);
    });
  });
});
