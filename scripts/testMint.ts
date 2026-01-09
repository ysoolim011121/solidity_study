import { ethers } from "hardhat";

//deploy.ts 실행 후 나온 주소를 여기에 넣는다
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  const [admin] = await ethers.getSigners();

  console.log("------------------------------------------");
  console.log("Admin:", admin.address);

  const watsonNFT = await ethers.getContractAt(
    "WatsonNFT",
    CONTRACT_ADDRESS
  );
  console.log("Contract address:", await watsonNFT.getAddress());

  // 테스트용 더미 데이터
  const wmId = 1001;
  const fileHash = ethers.id("This is a hash of the PDF content");
  const timestamp = Math.floor(Date.now() / 1000);
  const tokenURI = "https://ipfs.io/ipfs/QmTest...";

  console.log(`Minting document NFT (wm_id=${wmId})`);

  const tx = await watsonNFT.mintDocument(
    admin.address,
    wmId,
    fileHash,
    timestamp,
    tokenURI
  );

  await tx.wait();

  console.log("Mint success");

  // 검증
  const result = await watsonNFT.verifyDocument(wmId);

  console.log("Verification result");
  console.log("- exists:", result[0]);
  console.log("- tokenId:", result[1].toString());
  console.log("- owner:", result[2]);

  console.log("------------------------------------------");
  

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});