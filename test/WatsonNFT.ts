import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("WatsonNFT System", function () {
  // 테스트를 위한 배포 세팅 (Fixture)
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const WatsonNFT = await ethers.getContractFactory("WatsonNFT");
    const watsonNFT = await WatsonNFT.deploy();
    
    await watsonNFT.waitForDeployment(); // 배포 완료 대기

    return { watsonNFT, owner, user1, user2 };
  }

  // AI가 통과시켰을 때의 시나리오
  it("1. AI가 '정상(False)'으로 판단하면 즉시 'Approved' 상태가 되어야 함", async function () {
    const { watsonNFT, user1 } = await loadFixture(deployFixture);
    const wmId = 1000;
    const fileHash = ethers.keccak256(ethers.toUtf8Bytes("clean_image"));
    const tokenURI = "https://example.com/clean.json";

    // 마지막 인자에 false (의심 없음 -> 자동 통과) 입력
    await watsonNFT.connect(user1).mintDocument(user1.address, wmId, fileHash, 1234567890, tokenURI, false);

    // 검증 함수 호출
    const result = await watsonNFT.verifyDocument(wmId);
    
    // result[3]는 상태 문자열 ("Approved"여야 함)
    expect(result[3]).to.equal("Approved"); 
  });

  // AI가 의심했을 때의 시나리오
  it("2. AI가 '의심(True)'으로 판단하면 'Pending' 상태가 되어야 함", async function () {
    const { watsonNFT, user1 } = await loadFixture(deployFixture);
    const wmId = 1001;
    const fileHash = ethers.keccak256(ethers.toUtf8Bytes("fake_image"));
    const tokenURI = "https://example.com/fake.json";

    // 마지막 인자에 true (의심 -> 투표 필요) 입력
    await watsonNFT.connect(user1).mintDocument(user1.address, wmId, fileHash, 1234567890, tokenURI, true);

    const result = await watsonNFT.verifyDocument(wmId);
    expect(result[3]).to.equal("Pending"); 
  });

  it("3. 사용자들이 투표하면 찬성/반대가 정확히 기록되어야 함", async function () {
    const { watsonNFT, user1, user2 } = await loadFixture(deployFixture);
    
    // 의심(True) 상태로 민팅 -> TokenID 1번 생성됨
    await watsonNFT.mintDocument(user1.address, 1001, ethers.ZeroHash, 0, "uri", true);
    
    // user1은 "이거 도용이야(false = 반대)" 투표
    await watsonNFT.connect(user1).voteForDocument(1, false);
    
    // user2는 "이거 진짜야(true = 찬성)" 투표
    await watsonNFT.connect(user2).voteForDocument(1, true);

    // 문서 정보 확인
    const docInfo = await watsonNFT.documents(1);
    
    expect(docInfo.upvotes).to.equal(1);
    expect(docInfo.downvotes).to.equal(1);
  });

  it("4. 투표 종료 후 도용(반대)이 많으면 'Rejected'로 확정되어야 함", async function () {
    const { watsonNFT, user1, user2 } = await loadFixture(deployFixture);
    
    // 의심 상태로 민팅
    await watsonNFT.mintDocument(user1.address, 1001, ethers.ZeroHash, 0, "uri", true);

    // 2명이 "도용이다(false)"에 투표
    await watsonNFT.connect(user1).voteForDocument(1, false);
    await watsonNFT.connect(user2).voteForDocument(1, false);

    // 시간을 3일 + 1초 뒤로 강제 이동 (투표 기간 종료)
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    // 결과 확정 함수 호출
    await watsonNFT.finalizeStatus(1);

    // 상태 확인
    const result = await watsonNFT.verifyDocument(1001);
    expect(result[3]).to.equal("Rejected"); 
  });
});