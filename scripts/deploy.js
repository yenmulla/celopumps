const hre = require("hardhat");

async function main() {
  console.log("==========================================");
  console.log("  Deploying Stockpad Launchpad            ");
  console.log("==========================================");

  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;
  console.log("Network Name:", network.name);
  console.log("Chain ID:", chainId.toString());

  const [deployer] = await hre.ethers.getSigners();
  const ownerAddress = deployer.address;
  console.log("Deployer Address:", ownerAddress);

  // 1. Deploy HolderDistributor Implementation
  console.log("\n1. Deploying HolderDistributor implementation...");
  const HolderDistributor = await hre.ethers.getContractFactory("HolderDistributor");
  const distributorImpl = await HolderDistributor.deploy();
  await distributorImpl.waitForDeployment();
  const distributorImplAddress = await distributorImpl.getAddress();
  console.log("   HolderDistributor implementation deployed at:", distributorImplAddress);

  // 2. Deploy LaunchHook
  console.log("\n2. Deploying LaunchHook...");
  const LaunchHook = await hre.ethers.getContractFactory("LaunchHook");
  const hook = await LaunchHook.deploy(ownerAddress);
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  console.log("   LaunchHook deployed at:", hookAddress);

  // 3. Network Configuration Addresses
  let poolManagerAddress = "0x0000000000000000000000000000000000000001";
  let treasuryAddress = ownerAddress;
  let priceSignerAddress = ownerAddress;
  let wethAddress;
  let uniswapRouterAddress;

  if (chainId === 1n) {
    // Ethereum Mainnet
    console.log("Configuring for Ethereum Mainnet...");
    wethAddress = hre.ethers.getAddress("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
    uniswapRouterAddress = hre.ethers.getAddress("0xc36442b4a4522e871399cd717abdd847ab11fe88"); // Uniswap V3 NFPM / Router
  } else if (chainId === 11155111n) {
    // Ethereum Sepolia Testnet
    console.log("Configuring for Ethereum Sepolia...");
    wethAddress = hre.ethers.getAddress("0x7b79995e5f793a07bc00c21412e50ecae098e7f9");
    uniswapRouterAddress = hre.ethers.getAddress("0x1238536071e1c677a632429e3655c799b22cda52"); // Uniswap V3 NFPM
  } else if (chainId === 42220n) {
    // Celo Mainnet
    wethAddress = hre.ethers.getAddress("0x471ece3750da237f93b8e339c536989b8978a438");
    uniswapRouterAddress = hre.ethers.getAddress("0xe3d8bd6aed4f159bc8000a9cd47cffdb95f96121");
  } else {
    // Default Fallback
    wethAddress = hre.ethers.getAddress("0x7b79995e5f793a07bc00c21412e50ecae098E7f9");
    uniswapRouterAddress = hre.ethers.getAddress("0x1238536071e1c677a632429e3655c799b22cda52");
  }

  // 4. Deploy LaunchFactory
  console.log("\n3. Deploying LaunchFactory...");
  const LaunchFactory = await hre.ethers.getContractFactory("LaunchFactory");
  const factory = await LaunchFactory.deploy(
    ownerAddress,
    poolManagerAddress,
    treasuryAddress,
    priceSignerAddress,
    wethAddress,
    distributorImplAddress
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("   LaunchFactory deployed at:", factoryAddress);

  // 5. Configure Hook, Router, and Register Quote Asset
  console.log("\n4. Setting Hook on LaunchFactory...");
  const setHookTx = await factory.setHook(hookAddress);
  await setHookTx.wait();
  console.log("   Hook set successfully!");

  console.log("\n5. Setting Uniswap Router on LaunchFactory...");
  const setRouterTx = await factory.setRouter(uniswapRouterAddress);
  await setRouterTx.wait();
  console.log("   Uniswap Router set successfully!");

  console.log("\n6. Registering WETH Quote Asset...");
  const regTx = await factory.registerQuote(wethAddress);
  await regTx.wait();
  console.log("   Quote asset registered successfully!");

  console.log("\n==========================================");
  console.log("  DEPLOYMENT COMPLETED SUCCESSFULLY       ");
  console.log("==========================================");
  console.log("Factory Address: ", factoryAddress);
  console.log("Hook Address:    ", hookAddress);
  console.log("Uniswap Router:  ", uniswapRouterAddress);
  console.log("Distributor Impl:", distributorImplAddress);
  console.log("WETH Address:    ", wethAddress);
  console.log("==========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
