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

    constructor() public ERC1155("") {
        _recipient = owner();
    }

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) public {
        _mint(to, tokenId, amount, "");
    }

    // EIP2981 standard royalties return.
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        return (_recipient, (_salePrice * 1000) / 10000);
    }

    // Maintain flexibility to modify royalties recipient (could also add basis points).
    function _setRoyalties(address newRecipient) internal {
        require(
            newRecipient != address(0),
            "Royalties: new recipient is the zero address"
        );
        _recipient = newRecipient;
    }

    function setRoyalties(address newRecipient) external onlyOwner {
        _setRoyalties(newRecipient);
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
