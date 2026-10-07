const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Uniswap Graduation Integration & LP Burn Test", function () {
  let LaunchFactory;
  let factory;
  let hook;
  let mockWeth;
  let mockUniFactory;
  let mockUniRouter;
  let owner;
  let buyer;

  const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    buyer = signers[1];

    // 1. Deploy WETH
    const MockWETH = await ethers.getContractFactory("MockWETH");
    mockWeth = await MockWETH.deploy();

    // 2. Deploy Mock Uniswap Factory & Router
    const MockUniswapFactory = await ethers.getContractFactory("MockUniswapFactory");
    mockUniFactory = await MockUniswapFactory.deploy();

    const MockUniswapRouter = await ethers.getContractFactory("MockUniswapRouter");
    mockUniRouter = await MockUniswapRouter.deploy(
      await mockUniFactory.getAddress(),
      await mockWeth.getAddress()
    );

    // 3. Deploy LaunchHook
    const LaunchHook = await ethers.getContractFactory("LaunchHook");
    hook = await LaunchHook.deploy(owner.address);

    // 4. Deploy LaunchFactory
    const mockAddr = "0x0000000000000000000000000000000000000001";
    LaunchFactory = await ethers.getContractFactory("LaunchFactory");
    factory = await LaunchFactory.deploy(
      owner.address,
      mockAddr,
      owner.address,
      owner.address,
      await mockWeth.getAddress(),
      mockAddr
    );

    // 5. Configure Factory & set graduation threshold to 0.2 ETH for test
    await factory.setHook(await hook.getAddress());
    await factory.setRouter(await mockUniRouter.getAddress());
    await factory.registerQuote(await mockWeth.getAddress());
    await factory.setGraduationThreshold(ethers.parseEther("2"));
  });

  it("Should launch token, hit graduation threshold, create Uniswap pair, and burn LP tokens to 0xdead", async function () {
    const wethAddress = await mockWeth.getAddress();

    // 1. Launch a new token
    const launchParams = {
      name: "Moon Graduation Token",
      symbol: "MOONGRAD",
      metadataUri: "https://example.com/meta",
      quote: wethAddress,
      quoteUsdPrice: ethers.parseEther("3000"),
      priceDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
      priceSignature: "0x",
      feePpm: 10000, // 1% tax
      feesToHolders: false
    };

    const tx = await factory.connect(owner).createLaunch(launchParams, { value: 0 });
    const receipt = await tx.wait();
    const launchedEvent = receipt.logs.find(log => {
      try { return factory.interface.parseLog(log).name === 'Launched'; } catch { return false; }
    });

    const tokenAddress = factory.interface.parseLog(launchedEvent).args.token;
    expect(tokenAddress).to.not.equal(ethers.ZeroAddress);

    // Verify initial graduation state
    expect(await factory.isGraduated(tokenAddress)).to.equal(false);

    // 2. Buy token to reach the 2.0 ETH graduation threshold
    const buyAmount = ethers.parseEther("2.1"); // Exceeds 2.0 ETH threshold
    const buyTx = await factory.connect(buyer).buy(tokenAddress, { value: buyAmount });
    await buyTx.wait();

    // 3. Verify token is marked as graduated
    expect(await factory.isGraduated(tokenAddress)).to.equal(true);

    // 4. Verify Uniswap V2 Pair was automatically created on Uniswap Factory
    const pairAddress = await mockUniFactory.getPair(tokenAddress, wethAddress);
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);

    // 5. Verify LP tokens were minted directly to 0xdead (LP Burned!)
    const pairContract = await ethers.getContractAt("MockUniswapPair", pairAddress);
    const deadLpBalance = await pairContract.balanceOf(DEAD_ADDRESS);

    expect(deadLpBalance).to.be.gt(0);
    console.log("------------------------------------------------");
    console.log("  GRADUATION INTEGRATION TEST SUCCESSFUL!       ");
    console.log("------------------------------------------------");
    console.log("  Token Address:    ", tokenAddress);
    console.log("  Uniswap Pair:     ", pairAddress);
    console.log("  LP Burned (0xdead):", ethers.formatEther(deadLpBalance), "UNI-V2");
    console.log("------------------------------------------------");
  });
});
