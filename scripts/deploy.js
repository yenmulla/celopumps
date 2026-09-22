const hre = require("hardhat");

async function main() {
  console.log("Deploying LaunchpadFactory...");

  const network = await hre.ethers.provider.getNetwork();
  console.log("Network Name:", network.name);
  console.log("Chain ID:", network.chainId.toString());

  let graduationThreshold;
  let initialVirtualAsset;

  // Set chain-specific thresholds
  if (network.chainId === 10n || network.chainId === 42161n) {
    // Optimism or Arbitrum
    console.log("Configuring for L2 (1 ETH Graduation)...");
    graduationThreshold = hre.ethers.parseEther("1");
    initialVirtualAsset = hre.ethers.parseEther("0.25");
  } else {
    // Default (Celo)
    console.log("Configuring for Celo (2000 CELO Graduation)...");
    graduationThreshold = hre.ethers.parseEther("2000");
    initialVirtualAsset = hre.ethers.parseEther("500");
  }

  const LaunchpadFactory = await hre.ethers.getContractFactory("LaunchpadFactory");
  const factory = await LaunchpadFactory.deploy(graduationThreshold, initialVirtualAsset);

  await factory.waitForDeployment();


  const address = await factory.getAddress();
  console.log("LaunchpadFactory deployed to:", address);

  // Log final network confirmation
  console.log("Deployed on Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());


  console.log("\nDeployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
