const hre = require("hardhat");

async function main() {
  const factoryAddress = "0x0d86269ecE3BD9B1A28601206cb02094fE917792";
  console.log("Deploying LaunchHook for factory:", factoryAddress);

  const [deployer] = await hre.ethers.getSigners();

  const LaunchHook = await hre.ethers.getContractFactory("LaunchHook");
  const hook = await LaunchHook.deploy(deployer.address);
  await hook.waitForDeployment();

  const hookAddress = await hook.getAddress();
  console.log("LaunchHook deployed to:", hookAddress);

  const factory = await hre.ethers.getContractAt("LaunchFactory", factoryAddress);
  const tx = await factory.setHook(hookAddress);
  console.log("setHook tx sent:", tx.hash);
  await tx.wait();
  console.log("Hook configured on LaunchFactory successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
