import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// ABI 파일 경로
import artifact from "../artifacts/contracts/WatsonNFT.sol/WatsonNFT.json";

dotenv.config();

async function main() {
    // 1. 준비물 챙기기
    const API_URL = process.env.SEPOLIA_RPC_URL;
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const CONTRACT_ADDRESS = "0x9B97B5d23184De54084c6acE4aFf8Ac28708Ef21"; //배포 주소

    if (!PRIVATE_KEY || !API_URL) {
        throw new Error("환경 변수(.env)를 확인해주세요!");
    }

    // 2. 통신사(Provider)와 지갑(Wallet) 연결
    const provider = new ethers.JsonRpcProvider(API_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`지갑 연결 완료: ${wallet.address}`);

    // 3. 컨트랙트 연결하기 (주소 + ABI + 지갑)
    // 이 Address에 있는 ABI대로 동작하는 놈을 내 지갑으로 조종하기
    const watsonNFT = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

    // 4. 함수 호출하기 (Mint 실행)
    console.log("NFT 발행을 시작..");
    
    // 예시 데이터
    const toAddress = wallet.address; // 내 지갑으로 발행
    const wmId = 101; // 워터마크 ID (임의 숫자)
    const imgHash = ethers.id("hash_value_from_ai_model"); // 이미지 해시값
    const tokenUri = "https://example.com/metadata.json"; // 메타데이터 주소

    //현재 시간을 초단위로 구해서 넣기
    const timestamp = Math.floor(Date.now() / 1000);

    // mintDocument 함수 호출 (Solidity 코드에 있는 함수 이름이어야 함)
    const tx = await watsonNFT.mintDocument(toAddress, wmId, imgHash, timestamp, tokenUri);
    
    console.log(`트랜잭션 전송됨. 대기 중... (Hash: ${tx.hash})`);
    
    // 5. 결과 확인
    await tx.wait(); // 블록에 담길 때까지 기다림
    console.log("NFT 발행 성공!");
    console.log(`확인하러 가기: https://sepolia.etherscan.io/tx/${tx.hash}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});