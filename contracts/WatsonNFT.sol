// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; // 문자열 처리를 위해 추가

contract WatsonNFT is ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId = 1;

    // 1. 상태 정의 (보류, 승인, 거절)
    enum Status { Pending, Approved, Rejected }

    // 2. 문서 정보를 담는 구조체
    struct DocumentInfo {
        Status status;      // 현재 상태
        uint256 upvotes;    // "진짜" 투표 수
        uint256 downvotes;  // "도용" 투표 수
        uint256 endTime;    // 투표 종료 시간
        bytes32 fileHash;   // 파일 해시
        uint256 timestamp;  // 등록 시간
    }

    // wmId => tokenId 매핑
    mapping(uint32 => uint256) public wmIdToTokenId;
    
    // tokenId => 문서 상세 정보 매핑
    mapping(uint256 => DocumentInfo) public documents;

    // 중복 투표 방지: tokenId => (지갑주소 => 투표여부)
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // 3. 우리 플랫폼 기본 URL (도용 방지용)
    string public platformBaseUrl = "https://watson-project.com/verify/";

    event DocumentMinted(uint256 indexed tokenId, uint32 indexed wmId, address indexed owner, Status status);
    event Voted(uint256 indexed tokenId, address indexed voter, bool isOriginal);
    event StatusChanged(uint256 indexed tokenId, Status newStatus);

    constructor() ERC721("WatsonDocument", "WTS") Ownable(msg.sender) {}

    // 플랫폼 URL 변경 가능하게 (관리자만)
    function setPlatformBaseUrl(string memory _newUrl) public onlyOwner {
        platformBaseUrl = _newUrl;
    }

    // 민팅 함수 (초기 상태를 설정해서 발행)
    function mintDocument(
        address to,
        uint32 wmId,
        bytes32 fileHash,
        uint256 timestamp,
        string memory tokenURI_,
        bool isSuspicious // 서버에서 대조해봤을 때 의심스러우면 true
    ) public onlyOwner returns (uint256) {
        require(wmIdToTokenId[wmId] == 0, "WM_ID already registered");

        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        wmIdToTokenId[wmId] = tokenId;

        // 상태 결정 로직
        Status initialStatus;
        uint256 votingTime = 0;

        if (isSuspicious) {
            // 의심스러우면 '보류' 상태로 놓고, 3일간 투표 진행
            initialStatus = Status.Pending;
            votingTime = block.timestamp + 3 days; 
        } else {
            // 문제 없으면 바로 '승인'
            initialStatus = Status.Approved;
        }

        // 데이터 저장
        documents[tokenId] = DocumentInfo({
            status: initialStatus,
            upvotes: 0,
            downvotes: 0,
            endTime: votingTime,
            fileHash: fileHash,
            timestamp: timestamp
        });

        emit DocumentMinted(tokenId, wmId, to, initialStatus);

        return tokenId;
    }

    // 4. 투표 기능 (사용자들이 호출)
    // isOriginal: true면 "진짜다(승인 찬성)", false면 "도용이다(거절)"
    function voteForDocument(uint256 tokenId, bool isOriginal) public {
        DocumentInfo storage doc = documents[tokenId];

        require(doc.status == Status.Pending, "Not in voting period");
        require(block.timestamp < doc.endTime, "Voting time ended");
        require(!hasVoted[tokenId][msg.sender], "Already voted");

        // 투표 기록
        hasVoted[tokenId][msg.sender] = true;

        if (isOriginal) {
            doc.upvotes++;
        } else {
            doc.downvotes++;
        }

        emit Voted(tokenId, msg.sender, isOriginal);
    }

    // 5. 투표 종료 및 결과 반영 (누구나 호출 가능하거나, 관리자가 호출)
    function finalizeStatus(uint256 tokenId) public {
        DocumentInfo storage doc = documents[tokenId];

        require(doc.status == Status.Pending, "Not pending");
        require(block.timestamp >= doc.endTime, "Voting is still ongoing");

        // 과반수 로직 (예시: 도용 표가 더 많으면 거절)
        if (doc.downvotes > doc.upvotes) {
            doc.status = Status.Rejected;
            // (선택사항) 도용 확정시 NFT를 소각(Burn)해버릴 수도 있음
            // _burn(tokenId); 
        } else {
            doc.status = Status.Approved;
        }

        emit StatusChanged(tokenId, doc.status);
    }

    // 6. 도용 방지 링크 확인 함수
    // 이 함수를 호출하면 "https://watson-project.com/verify/1001" 형태의 링크가 나옴
    function getVerificationLink(uint256 tokenId) public view returns (string memory) {
        // 소유권이 없거나 존재하지 않는 토큰 체크
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        // base URL + Token ID 결합
        return string(abi.encodePacked(platformBaseUrl, tokenId.toString()));
    }

    // 기존 검증 함수 업그레이드
    function verifyDocument(uint32 wmId) external view returns (
        bool exists,
        uint256 tokenId,
        address owner,
        string memory status, // 상태를 문자열로 반환
        string memory verificationLink // 링크도 같이 반환
    ) {
        tokenId = wmIdToTokenId[wmId];

        if (tokenId == 0) {
            return (false, 0, address(0), "", "");
        }

        DocumentInfo memory doc = documents[tokenId];
        
        string memory statusStr;
        if (doc.status == Status.Pending) statusStr = "Pending";
        else if (doc.status == Status.Approved) statusStr = "Approved";
        else statusStr = "Rejected";

        return (
            true, 
            tokenId, 
            ownerOf(tokenId), 
            statusStr, 
            getVerificationLink(tokenId)
        );
    }
}