import { ethers } from "hardhat";


const CONTRACT_ADDRESS = "0x16dBD877598632fc398097A95a95dF75d26013a0"; 

async function main() {
  const [admin] = await ethers.getSigners();
  const watsonNFT = await ethers.getContractAt("WatsonNFT", CONTRACT_ADDRESS);

  // 1. 의심스러운 문서 하나를 민팅하기
  const wmId = 7777; // 테스트용 ID
  console.log(`\n1. 의심스러운 문서(wmId: ${wmId}) 등록 중...`);
  
  const mintTx = await watsonNFT.mintDocument(
    admin.address,
    wmId,
    ethers.ZeroHash,
    1234567890,
    "https://fake-image.com",
    true // true로 설정해서 'Pending(투표중)' 상태로 만듦
  );
  await mintTx.wait();
  console.log("-> 등록 완료 (상태: Pending)");

  // 토큰 ID 가져오기
  const tokenId = await watsonNFT.wmIdToTokenId(wmId);
  console.log(`-> Token ID: ${tokenId}`);

  // 2. 투표하기 (도용이다! 반대 투표)
  console.log("\n2. 투표 진행 중 (반대 표 던지는 중)...");
  // false = 도용이다(반대), true = 진짜다(찬성)
  const voteTx = await watsonNFT.voteForDocument(tokenId, false); 
  await voteTx.wait();
  console.log("-> 투표 완료!");

  // 3. 결과 확인
  const docInfo = await watsonNFT.documents(tokenId);
  console.log("\n3. 현재 투표 현황:");
  console.log(`- 찬성(Upvotes): ${docInfo.upvotes}`);
  console.log(`- 반대(Downvotes): ${docInfo.downvotes}`);
  console.log(`- 현재 상태: Pending (3일 뒤 종료됨)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});