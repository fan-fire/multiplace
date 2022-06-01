pragma solidity 0.8.5;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./IListings.sol";

interface IMultiplace is IERC165 {
    event Listed(
        uint256 listPtr,
        address indexed tokenAddr,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 unitPrice,
        uint256 amount,
        address paymentToken,
        IListings.NFT_TYPE nftType,
        address royaltyReceiver,
        uint256 unitRoyaltyAmount
    );
    event Bought(
        uint256 listPtr,
        address indexed tokenAddr,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 unitPrice,
        uint256 amount,
        address paymentToken,
        IListings.NFT_TYPE nftType,
        address royaltyReceiver,
        uint256 unitRoyaltyAmount
    );

    event FundsWithdrawn(
        address indexed to,
        address indexed paymentToken,
        uint256 amount
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

    function buy(
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 amount
    ) external;

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
            IListings.Listing memory listing
        );

    function unlistStale(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external;

    function reserve(
        address seller,
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

    function unlist(address tokenAddr, uint256 tokenId) external;

    function getListingPointer(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view returns (uint256 listPtr);

    function isListed(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view returns (bool listed);

    function getBalance(address paymentToken, address account)
        external
        returns (uint256 balance);

    function getListingByPointer(uint256 listPtr)
        external
        view
        returns (IListings.Listing memory listing);

    function getListing(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view returns (IListings.Listing memory listing);

    function getAllListings()
        external
        view
        returns (IListings.Listing[] memory listings);

    function pullFunds(address paymentToken, uint256 amount) external;

    function addPaymentToken(address paymentToken) external;

    function isPaymentToken(address paymentToken) external view returns (bool);

    function getUnitRoyalties(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view returns (IListings.Royalty memory royalty);

    function getSellers(address tokenAddr, uint256 tokenId)
        external
        view
        returns (address[] memory sellers);

    function getListings(address tokenAddr, uint256 tokenId)
        external
        view
        returns (IListings.Listing[] memory listings);

    function changeProtocolWallet(address newProtocolWallet) external;

    function changeProtocolFee(uint256 feeNumerator, uint256 feeDenominator)
        external;

    function protocolFeeNumerator() external view returns (uint256);

    function protocolFeeDenominator() external view returns (uint256);

    function protocolWallet() external view returns (address);
}
