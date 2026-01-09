import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("------------------------------------------");
  console.log("Deploying contracts with:", deployer.address);

  const WatsonNFT = await ethers.getContractFactory("WatsonNFT");
  const watsonNFT = await WatsonNFT.deploy();

  await watsonNFT.waitForDeployment();

  const address = await watsonNFT.getAddress();

  console.log("WatsonNFT deployed at:", address);
  console.log("------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
