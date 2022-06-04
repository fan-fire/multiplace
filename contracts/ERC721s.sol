// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract ERC721WithoutOwnerMock is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("MyToken", "MTK") {}

    function mint(address to) public returns (uint256) {
        uint256 newItemId = _tokenIds.current();
        _tokenIds.increment();
        _mint(to, newItemId);
        return newItemId;
    }
}

contract ERC721Mock is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("MyToken", "MTK") {}

    function mint(address to) public returns (uint256) {
        uint256 newItemId = _tokenIds.current();
        _tokenIds.increment();
        _mint(to, newItemId);
        return newItemId;
    }
}

contract ERC721WithERC2981Mock is ERC721URIStorage, IERC2981, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address private _recipient;
    uint256 private _royaltyPercentage = 10;

    constructor() ERC721("TOKEN", "TKN") {
        _recipient = owner();
    }

    function mint(address to) public returns (uint256) {
        uint256 newItemId = _tokenIds.current();
        _tokenIds.increment();
        _mint(to, newItemId);
        return newItemId;
    }

    // EIP2981 standard royalties return.
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        return (
            _recipient,
            (_salePrice * _royaltyPercentage) / 100 + _tokenId * 0
        );
    }

    function _setRoyalties(address newRecipient, uint256 newPercentage)
        internal
    {
        _recipient = newRecipient;
        _royaltyPercentage = newPercentage;
    }

    function setRoyalties(address newRecipient, uint256 newPercentage)
        external
        onlyOwner
    {
        _setRoyalties(newRecipient, newPercentage);
    }

    // EIP2981 standard Interface return. Adds to ERC1155 and ERC165 Interface returns.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, IERC165)
        returns (bool)
    {
        return (interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId));
    }
}
