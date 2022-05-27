// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;
import "./IListings.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";

library NFTLib {
    using ERC165Checker for address;

    function getType(address tokenAddr)
        public
        returns (IListings.NFT_TYPE tokenType)
    {
        require(tokenAddr.supportsERC165(), "NFT not ERC165");

        bool isERC721 = tokenAddr.supportsInterface(type(IERC721).interfaceId);
        bool isERC1155 = tokenAddr.supportsInterface(
            type(IERC1155).interfaceId
        );
        bool isERC2981 = tokenAddr.supportsInterface(
            type(IERC2981).interfaceId
        );

        // get NFT type, one of ERC721, ERC1155, ERC721_2981, ERC1155_2981
        if (isERC1155 && !isERC2981) {
            tokenType = IListings.NFT_TYPE.ERC1155;
        } else if (isERC721 && !isERC2981) {
            tokenType = IListings.NFT_TYPE.ERC721;
        } else if (isERC1155 && isERC2981) {
            tokenType = IListings.NFT_TYPE.ERC1155_2981;
        } else if (isERC721 && isERC2981) {
            tokenType = IListings.NFT_TYPE.ERC721_2981;
        } else {
            tokenType = IListings.NFT_TYPE.UNKNOWN;
        }
    }
}
