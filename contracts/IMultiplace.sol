pragma solidity 0.8.4;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IMultiplace is IERC165 {
    enum NFTType {
        ERC721,
        ERC721_2981,
        ERC1155,
        ERC1155_2981
    }

    struct Royalty {
        address receiver;
        uint256 royaltyAmount;
    }

    struct Listing {
        uint256 listPtr; //Pointer to where this listing is located in the listings array
        address nftAddress; //Address of the ERC721 or ERC1155 contract of the listed item
        uint256 tokenId; //token ID of the listed item for nftAddress
        address seller; //Address of the seller
        uint256 price; //Price of the listed item
        address paymentToken; //Address of the ERC20 contract that will be used to pay for the listing
        NFTType nftType; //Type of the listed item. Either ERC721 or ERC1155 with or without ERC2981
        uint256 reservedUntil; //Timestamp when the listing will be reserved
        address reservedFor; //Address of the buyer who reserved the listing
    }

    event ProtocolWalletChanged(address newProtocolWallet);
    event ProtocolFeeChanged(
        uint256 newProtocolFeeNumerator,
        uint256 newProtocolFeeDenominator
    );
    event Listed(
        uint256 listPtr,
        address indexed tokenAddr,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 unitPrice,
        address paymentToken,
        NFTType nftType,
        address royaltyReceiver,
        uint256 royaltyAmount
    );
    event Bought(
        uint256 listPtr,
        address indexed tokenAddr,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 unitPrice,
        address paymentToken,
        NFTType nftType,
        address royaltyReceiver,
        uint256 royaltyAmount
    );
    event PaymentTokenAdded(address indexed paymentToken);
    // event PaymentTokenRemoved(address indexed paymentToken);

    event FundsWithdrawn(
        address indexed to,
        address indexed paymentToken,
        uint256 amount
    );
    event RoyaltiesSet(
        address indexed tokenAddr,
        uint256 indexed tokenId,
        address indexed royaltyReceiver,
        uint256 royaltyAmount
    );
    event Unlisted(address indexed tokenAddr, uint256 indexed tokenId);

    event Reserved(
        address indexed tokenAddr,
        uint256 indexed tokenId,
        address indexed reservedFor,
        uint256 period,
        uint256 reservedUntil
    );

    event UnlistStale(address indexed tokenAddr, uint256 indexed tokenId);

    function list(
        address tokenAddr,
        uint256 tokenId,
        uint256 amount,
        uint256 unitPrice,
        address paymentToken
    ) external;

    function buy(address tokenAddr, uint256 tokenId) external;

    function status(address tokenAddr, uint256 tokenId)
        external
        view
        returns (bool isSellerOwner, bool isTokenStillApproved);

    function unlistStale(address tokenAddr, uint256 tokenId) external;

    function reserve(
        address tokenAddr,
        uint256 tokenId,
        uint256 period,
        address reservee
    ) external;

    function getReservedState(address tokenAddr, uint256 tokenId)
        external
        view
        returns (address reservedFor, uint256 reservedUntil);

    function unlist(address tokenAddr, uint256 tokenId) external;

    function getListingPointer(address tokenAddr, uint256 tokenId)
        external
        view
        returns (uint256 listPtr);

    function addPaymentToken(address paymentToken) external;

    function changeProtocolWallet(address newProtocolWallet) external;

    function changeProtocolFee(
        uint256 newProtocolFeeNumerator,
        uint256 newProtocolFeeDenominator
    ) external;

    function isListed(address tokenAddr, uint256 tokenId)
        external
        view
        returns (bool hasBeenListed);

    function isPaymentToken(address tokenAddress)
        external
        view
        returns (bool isApproved);

    function getBalance(address paymentToken, address account)
        external
        view
        returns (uint256 balance);

    function getListingByPointer(uint256 listPtr)
        external
        view
        returns (Listing memory listing);

    function getListing(address tokenAddr, uint256 tokenId)
        external
        view
        returns (Listing memory listing);

    function getAllListings() external view returns (Listing[] memory listings);

    function getRoyalties(address tokenAddr, uint256 tokenId)
        external
        view
        returns (Royalty memory royalty);

    function updateRoyaltyAmount(
        address tokenAddr,
        uint256 tokenId,
        uint256 amount
    ) external;

    function pullFunds(address paymentToken, uint256 amount) external;
}
