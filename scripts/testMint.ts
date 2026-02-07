import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "0x16dBD877598632fc398097A95a95dF75d26013a0";

async function main() {
  const [admin] = await ethers.getSigners();

  console.log("------------------------------------------");
  console.log("Start Test Minting...");
  console.log("Admin Account:", admin.address);

  const watsonNFT = await ethers.getContractAt(
    "WatsonNFT",
    CONTRACT_ADDRESS
  );
  console.log("Contract loaded at:", await watsonNFT.getAddress());

  // 테스트용 더미 데이터
  const wmId = 2002;
  const fileHash = ethers.id("Test PDF Content Hash"); // 간단하게 해시 생성
  const timestamp = Math.floor(Date.now() / 1000);
  const tokenURI = "https://ipfs.io/ipfs/QmTestImage...";
  
  //핵심 변경 1: 도용 의심 여부 (false = 정상, true = 의심/투표시작)
  const isSuspicious = false; 

  console.log(`Minting document NFT (wm_id=${wmId})...`);

  //핵심 변경 2: 함수 호출 시 인자(isSuspicious) 하나 더 추가됨
  const tx = await watsonNFT.mintDocument(
    admin.address,
    wmId,
    fileHash,
    timestamp,
    tokenURI,
    isSuspicious 
  );

  console.log("Waiting for transaction...");
  await tx.wait();

  console.log("Mint success!");

  // 검증 확인
  const result = await watsonNFT.verifyDocument(wmId);

  console.log("------------------------------------------");
  console.log("[Verification Result]");
  console.log("- Exists       :", result[0]);
  console.log("- TokenId      :", result[1].toString());
  console.log("- Owner        :", result[2]);
  
  //핵심 변경 3: 새로 추가된 리턴값(Status, Link) 출력
  console.log("- Status       :", result[3]); // "Approved" or "Pending"
  console.log("- Verify Link  :", result[4]); // https://watson...
  console.log("------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});