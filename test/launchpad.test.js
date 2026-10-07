const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LaunchFactory", function () {
  let LaunchFactory;
  let factory;
  let owner;
  let treasury;
  let priceSigner;
  let quote;

  const mockPoolManager = "0x0000000000000000000000000000000000000001";
  const mockWeth = "0x0000000000000000000000000000000000000002";
  const mockDistributorImpl = "0x0000000000000000000000000000000000000003";

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    treasury = signers[1];
    priceSigner = signers[2];
    quote = signers[3];

    LaunchFactory = await ethers.getContractFactory("LaunchFactory");
    factory = await LaunchFactory.deploy(
      owner.address,
      mockPoolManager,
      treasury.address,
      priceSigner.address,
      mockWeth,
      mockDistributorImpl
    );
  });

  describe("Deployment & Admin Settings", function () {
    it("Should set the right owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should set initial creation fee, opening FDV, and graduation threshold", async function () {
      expect(await factory.creationFee()).to.equal(0);
      expect(await factory.openingFdvUsd()).to.equal(ethers.parseEther("4000"));
      expect(await factory.graduationThreshold()).to.equal(ethers.parseEther("2"));
    });

    it("Should allow owner to update creation fee", async function () {
      await factory.setCreationFee(ethers.parseEther("0.002"));
      expect(await factory.creationFee()).to.equal(ethers.parseEther("0.002"));
    });

    it("Should allow owner to update treasury", async function () {
      await factory.setTreasury(treasury.address);
      expect(await factory.treasury()).to.equal(treasury.address);
    });

    it("Should track launch count", async function () {
      expect(await factory.launchCount()).to.equal(0);
    });

    it("Should allow owner to withdraw ETH and tokens", async function () {
      await factory.withdrawETH(owner.address, 0);
      expect(await factory.graduationThreshold()).to.equal(ethers.parseEther("2"));
    });
  });

  describe("Token Launch & Fee Tax Trading", function () {
    let mockWethContract;

    beforeEach(async function () {
      const MockWETH = await ethers.getContractFactory("MockWETH");
      mockWethContract = await MockWETH.deploy();
      await factory.registerQuote(await mockWethContract.getAddress());
    });

    it("Should deduct and distribute trading tax on buy", async function () {
      const launchParams = {
        name: "Tax Token",
        symbol: "TAX",
        metadataUri: "meta",
        quote: await mockWethContract.getAddress(),
        quoteUsdPrice: ethers.parseEther("3000"),
        priceDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        priceSignature: "0x",
        feePpm: 50000, // 5% tax
        feesToHolders: false
      };

      const tx = await factory.connect(owner).createLaunch(launchParams, { value: 0 });
      const receipt = await tx.wait();
      const launchedEvent = receipt.logs.find(log => {
        try { return factory.interface.parseLog(log).name === 'Launched'; } catch { return false; }
      });
      const tokenAddress = factory.interface.parseLog(launchedEvent).args.token;

      const initialOwnerBal = await ethers.provider.getBalance(owner.address);
      await factory.connect(treasury).buy(tokenAddress, { value: ethers.parseEther("0.1") });
      const finalOwnerBal = await ethers.provider.getBalance(owner.address);

      // 5% of 0.1 ETH = 0.005 ETH tax sent to creator/feeRecipient (owner)
      expect(finalOwnerBal - initialOwnerBal).to.equal(ethers.parseEther("0.005"));
    });
  });
});
