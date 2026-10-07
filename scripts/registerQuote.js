const hre = require("hardhat");

async function main() {
  const factoryAddress = "0x9CFAEd22fEAD7ab5250Fcd5F1e029177bCeE6909";
  const wethAddress = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

  console.log("Registering WETH quote asset on Sepolia LaunchFactory:", factoryAddress);
  const factory = await hre.ethers.getContractAt("LaunchFactory", factoryAddress);

  const tx = await factory.registerQuote(wethAddress);
  console.log("Tx sent:", tx.hash);
  await tx.wait();
  console.log("WETH quote asset registered successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
