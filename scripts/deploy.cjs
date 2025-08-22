const hre = require("hardhat");

async function main() {
  const Leaderboard = await hre.ethers.getContractFactory("Leaderboard");
  const leaderboard = await Leaderboard.deploy(); // deploys contract

  await leaderboard.waitForDeployment(); // ethers v6 syntax

  console.log("Leaderboard deployed to:", await leaderboard.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});