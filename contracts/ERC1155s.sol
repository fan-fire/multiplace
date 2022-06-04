// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC1155WithoutOwnerMock is ERC1155 {
    constructor() ERC1155("") {}

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) public {
        _mint(to, tokenId, amount, "");
    }
}

contract ERC1155Mock is ERC1155, Ownable {
    constructor() ERC1155("") {}

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) public {
        _mint(to, tokenId, amount, "");
    }
}

contract ERC1155WithERC2981Mock is ERC1155, IERC2981, Ownable {
    address private _recipient;
    uint256 private _royaltyPercentage = 10;

    constructor() ERC1155("") {
        _recipient = owner();
    }

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) public {
        _mint(to, tokenId, amount, "");
    }

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
        override(ERC1155, IERC165)
        returns (bool)
    {
        return (interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId));
    }
}
