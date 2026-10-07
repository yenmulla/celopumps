const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==========================================");
  console.log("  Deploying Stockpad Launchpad Locally    ");
  console.log("==========================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer Address:", deployer.address);

  // 1. Deploy Mock WETH
  console.log("\n1. Deploying Mock WETH...");
  const MockWETH = await hre.ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("   Mock WETH deployed at:", wethAddress);

  // 2. Deploy LaunchHook
  console.log("\n2. Deploying LaunchHook...");
  const LaunchHook = await hre.ethers.getContractFactory("LaunchHook");
  const hook = await LaunchHook.deploy(deployer.address);
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  console.log("   LaunchHook deployed at:", hookAddress);

  // 3. Deploy LaunchFactory
  console.log("\n3. Deploying LaunchFactory...");
  const poolManagerAddress = "0x0000000000000000000000000000000000000001";
  const treasuryAddress = deployer.address;
  const priceSignerAddress = deployer.address;
  const distributorImplAddress = "0x0000000000000000000000000000000000000002";

  const LaunchFactory = await hre.ethers.getContractFactory("LaunchFactory");
  const factory = await LaunchFactory.deploy(
    deployer.address,
    poolManagerAddress,
    treasuryAddress,
    priceSignerAddress,
    wethAddress,
    distributorImplAddress
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("   LaunchFactory deployed at:", factoryAddress);

  // 4. Configure Hook
  console.log("\n4. Configuring Hook on Factory...");
  const setHookTx = await factory.setHook(hookAddress);
  await setHookTx.wait();
  console.log("   Hook configured successfully!");

  // 5. Register Quote
  console.log("\n5. Registering WETH Quote Asset...");
  const regQuoteTx = await factory.registerQuote(wethAddress);
  await regQuoteTx.wait();
  console.log("   WETH Quote Asset registered successfully!");

  console.log("\n==========================================");
  console.log("  Local Deployment Completed Successfully ");
  console.log("==========================================");
  console.log("Factory Address: ", factoryAddress);
  console.log("Hook Address:    ", hookAddress);
  console.log("WETH Address:    ", wethAddress);
  console.log("==========================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
