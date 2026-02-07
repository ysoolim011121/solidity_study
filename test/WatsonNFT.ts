import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("WatsonNFT Voting System", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const WatsonNFT = await ethers.getContractFactory("WatsonNFT");
    const watsonNFT = await WatsonNFT.deploy();
    return { watsonNFT, owner, user1, user2 };
  }

  it("1. 의심스러운 문서(도용 의심) 등록 시 'Pending' 상태가 되어야 함", async function () {
    const { watsonNFT, owner, user1 } = await loadFixture(deployFixture);
    const wmId = 1001;
    const fileHash = ethers.keccak256(ethers.toUtf8Bytes("fake_image"));
    const tokenURI = "https://example.com/metadata.json";

    // 마지막 인자에 true (의심) 넣기
    await watsonNFT.mintDocument(user1.address, wmId, fileHash, 1234567890, tokenURI, true);

    // 상태 확인 (verifyDocument 호출)
    const result = await watsonNFT.verifyDocument(wmId);
    // result[3]가 status 문자열
    expect(result[3]).to.equal("Pending"); 
  });

  it("2. 사용자들이 투표하면 찬성/반대가 기록되어야 함", async function () {
    const { watsonNFT, user1, user2 } = await loadFixture(deployFixture);
    
    // 1001번 문서를 '의심(true)' 상태로 민팅
    await watsonNFT.mintDocument(user1.address, 1001, ethers.ZeroHash, 0, "uri", true);
    
    // TokenID는 1번임.
    // user1은 "이거 도용이야(false)" 투표
    await watsonNFT.connect(user1).voteForDocument(1, false);
    
    // user2는 "이거 진짜야(true)" 투표
    await watsonNFT.connect(user2).voteForDocument(1, true);

    // 문서 정보 가져오기 (public mapping 조회)
    const docInfo = await watsonNFT.documents(1);
    
    // upvotes(찬성) 1, downvotes(반대) 1 이어야 함
    expect(docInfo.upvotes).to.equal(1);
    expect(docInfo.downvotes).to.equal(1);
  });

  it("3. 투표 종료 후 도용으로 확정되면 상태가 'Rejected'로 변해야 함", async function () {
    const { watsonNFT, user1, user2 } = await loadFixture(deployFixture);
    
    // 의심 상태로 민팅
    await watsonNFT.mintDocument(user1.address, 1001, ethers.ZeroHash, 0, "uri", true);

    // 2명이 "도용이다(false)"에 투표
    await watsonNFT.connect(user1).voteForDocument(1, false);
    await watsonNFT.connect(user2).voteForDocument(1, false);

    // 시간을 3일 뒤로 강제 이동
    await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    // 결과 확정 함수 호출
    await watsonNFT.finalizeStatus(1);

    // 상태 확인
    const result = await watsonNFT.verifyDocument(1001);
    expect(result[3]).to.equal("Rejected"); // 거절됨 확인
  });
});