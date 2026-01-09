pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WatsonNFT is ERC721URIStorage, Ownable {
    
    uint256 private _nextTokenId = 1;

    //wm_id => tokenId
    mapping(uint32 => uint256) public wmIdToTokenId;

    event DocumentMinted(
        uint256 indexed tokenId,
        uint32 indexed wmId,
        address indexed owner,
        bytes32 fileHash,
        uint256 timestamp
    );

    constructor() ERC721("WatsonDocument", "WTS") Ownable(msg.sender) {}

    function mintDocument(
        address to,
        uint32 wmId,
        bytes32 fileHash,
        uint256 timestamp,
        string memory tokenURI_
    ) public onlyOwner returns (uint256) {
        require(wmIdToTokenId[wmId] == 0, "WM_ID already registered");

        uint256 tokenId = _nextTokenId++;

        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        wmIdToTokenId[wmId] = tokenId;

        emit DocumentMinted(tokenId, wmId, to, fileHash, timestamp);

        return tokenId;
    }

    function verifyDocument(uint32 wmId) external view returns (
        bool exists,
        uint256 tokenId,
        address owner
    ) {
        tokenId = wmIdToTokenId[wmId];

        if (tokenId == 0) {
            return (false, 0, address(0));
        }

        return (true, tokenId, ownerOf(tokenId));
    }
}