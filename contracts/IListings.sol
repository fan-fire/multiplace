pragma solidity 0.8.5;

interface IListings {
    enum NFT_TYPE {
        ERC721,
        ERC721_2981,
        ERC1155,
        ERC1155_2981,
        UNKNOWN
    }

    struct Royalty {
        address receiver;
        uint256 royaltyAmount;
    }

    struct Listing {
        uint256 listPtr; //Pointer to where this listing is located in the listings array
        address tokenAddr; //Address of the ERC721 or ERC1155 contract of the listed item
        uint256 tokenId; //token ID of the listed item for tokenAddr
        address seller; //Address of the seller
        uint256 unitPrice; //unitPrice of the listed item
        uint256 amount; //number of tokens in listing
        address paymentToken; //Address of the ERC20 contract that will be used to pay for the listing
        NFT_TYPE nftType; //Type of the listed item. Either ERC721 or ERC1155 with or without ERC2981
        uint256 reservedUntil; //Timestamp when the listing will be reserved
        address reservedFor; //Address of the buyer who reserved the listing
    }

    function list(
        address lister,
        address tokenAddr,
        uint256 tokenId,
        uint256 amount,
        uint256 unitPrice,
        address paymentToken
    ) external;

    function unlist(
        address unlister,
        address tokenAddr,
        uint256 tokenId
    ) external;

    function buy(
        address buyer,
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 amount
    ) external returns (bool);

    function status(
        address seller,
        address tokenAddr,
        uint256 tokenId
    )
        external
        view
        returns (
            bool isSellerOwner,
            bool isTokenStillApproved,
            Listing memory listing
        );

    function unlistStale(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external;

    function getListingPointer(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view returns (uint256 listPtr);

    // Method that checks if seller has listed tokenAddr:tokenId
    function isListed(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view returns (bool listed);

    function getListingByPointer(uint256 listPtr)
        external
        view
        returns (Listing memory listing);

    function getListing(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view returns (Listing memory listing);

    function getAllListings() external view returns (Listing[] memory listings);

    function getRoyalties(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view returns (Royalty memory royalty);

    function reserve(
        address tokenAddr,
        uint256 tokenId,
        uint256 period,
        address reservee
    ) external;

    function getReservedState(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external returns (address reservedFor, uint256 reservedUntil);
}
