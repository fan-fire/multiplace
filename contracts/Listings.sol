pragma solidity 0.8.5;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "./IListings.sol";
import "hardhat/console.sol";

contract Listings is IListings {
    using ERC165Checker for address;

    address public owner;
    uint256 public numListings; //Number of listings in the marketplace
    Listing[] internal _listings; //Listings of the marketplace

    mapping(address => mapping(address => mapping(uint256 => bool)))
        internal _isListed; //Mapping from lister.tokenAddr.tokenId -> are there 1 or more of the token liste by lister
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        internal _token2Ptr; //Mapping from lister.tokenAddr.tokenId -> listPtr to quickly lookup the listing given lister.tokenAddr.tokenId
    mapping(address => mapping(address => mapping(uint256 => Royalty)))
        internal _royalties; //Royalties of each lister.tokenAddr.tokenId pair

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
        uint256 royaltyAmount
    );
    event Bought(
        uint256 listPtr,
        address indexed tokenAddr,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 unitPrice,
        uint256 amount,
        address paymentToken,
        IListings.NFT_TYPE nftType,
        address royaltyReceiver,
        uint256 royaltyAmount
    );

    event Unlisted(address indexed tokenAddr, uint256 indexed tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function list(
        address lister,
        address tokenAddr,
        uint256 tokenId,
        uint256 amount,
        uint256 unitPrice,
        address paymentToken
    ) external override onlyOwner {
        // check passed variable values
        require(
            !_isListed[lister][tokenAddr][tokenId],
            "NFT already listed by sender"
        );
        require(amount > 0, "Invalid amount");
        require(unitPrice > 0, "Invalid price");

        // update _isListed first to avoid reentrancy
        _isListed[lister][tokenAddr][tokenId] = true;

        // check that we've got a valid 721 or 1155, either with, or without 2981
        NFT_TYPE _nftType = getType(tokenAddr);
        require(_nftType != NFT_TYPE.UNKNOWN, "NFT type unknown");

        // check if sender owns NFT-tokenId
        // check that marketplace is allowed to transfer NFT-tokenId
        if (_nftType == NFT_TYPE.ERC1155 || _nftType == NFT_TYPE.ERC1155_2981) {
            require(
                IERC1155(tokenAddr).balanceOf(lister, tokenId) >= amount,
                "Sender not owner of amount"
            );
            require(
                IERC1155(tokenAddr).isApprovedForAll(lister, owner),
                "Marketplace not approved for ERC1155"
            );
        }
        if (_nftType == NFT_TYPE.ERC721 || _nftType == NFT_TYPE.ERC721_2981) {
            amount = 1;
            require(
                IERC721(tokenAddr).ownerOf(tokenId) == lister,
                "Sender not owner"
            );
            require(
                IERC721(tokenAddr).isApprovedForAll(lister, owner),
                "Marketplace not approved for ERC721"
            );
        }

        // get numListings for listPtr
        uint256 listPtr = numListings;
        // create listing
        Listing memory listing = Listing(
            listPtr,
            tokenAddr,
            tokenId,
            lister,
            unitPrice,
            amount,
            paymentToken,
            _nftType,
            0,
            address(0)
        );

        numListings = numListings + 1;

        // if nft supports ERC2981, create Royalties for tokenAddr/tokenId and set artist=receiver
        Royalty memory royalty = Royalty(address(0), 0);
        if (
            _nftType == NFT_TYPE.ERC721_2981 ||
            _nftType == NFT_TYPE.ERC1155_2981
        ) {
            address receiver;
            uint256 royaltyAmount;
            (receiver, royaltyAmount) = IERC2981(tokenAddr).royaltyInfo(
                tokenId,
                unitPrice
            );
            royalty = Royalty(receiver, royaltyAmount);
        }
        // set royalties mapping
        _royalties[lister][tokenAddr][tokenId] = royalty;

        // update _token2Ptr
        _token2Ptr[lister][tokenAddr][tokenId] = listPtr;

        // add to _listings
        _listings.push(listing);

        emit Listed(
            listPtr,
            tokenAddr,
            tokenId,
            lister,
            unitPrice,
            amount,
            paymentToken,
            _nftType,
            royalty.receiver,
            royalty.royaltyAmount
        );
    }

    function unlist(
        address unlister,
        address tokenAddr,
        uint256 tokenId
    ) public override onlyOwner {
        console.log("Listings.unlist: %s %s %s", unlister, tokenAddr, tokenId);
        Listing memory listing = getListing(unlister, tokenAddr, tokenId);
        // check reserving

        require(block.timestamp >= listing.reservedUntil, "NFT reserved");
        assert(_unlist(listing));
    }

    function buy(
        address buyer,
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 amount
    ) public override onlyOwner returns (bool) {
        Listing memory listing = getListing(seller, tokenAddr, tokenId);
        // check reserving
        require(block.timestamp >= listing.reservedUntil, "NFT reserved");
        require(listing.amount >= amount, "Not enough amount");

        // check if listing is still valid
        bool isSellerOwner;
        bool isTokenStillApproved;
        (isSellerOwner, isTokenStillApproved, listing) = status(
            seller,
            tokenAddr,
            tokenId
        );

        require(isSellerOwner, "NFT not owned");
        require(isTokenStillApproved, "NFT not approved");

        // check reserving
        if (block.timestamp < listing.reservedUntil) {
            require(listing.reservedFor == buyer, "NFT reserved");
        }

        if (listing.amount - amount > 0) {
            listing.amount = listing.amount - amount;
            _listings[listing.listPtr] = listing;

            // emit Bought(
            //     listing.listPtr,
            //     listing.tokenAddr,
            //     listing.tokenId,
            //     listing.seller,
            //     buyer,
            //     listing.unitPrice,
            //     listing.amount,
            //     listing.paymentToken,
            //     listing.nftType,
            //     listing.royaltyReceiver,
            //     listing.royaltyAmount
            // );
        } else {
            assert(_unlist(listing));
        }

        return true;
    }

    function _unlist(Listing memory listingToRemove)
        internal
        onlyOwner
        returns (bool)
    {
        uint256 listPtrToRemove = listingToRemove.listPtr;
        // pop from _listings,
        Listing memory lastListing = _listings[_listings.length - 1];
        lastListing.listPtr = listPtrToRemove;
        _listings[listPtrToRemove] = lastListing;
        _listings.pop();

        // update _token2Ptr
        _token2Ptr[lastListing.seller][lastListing.tokenAddr][
            lastListing.tokenId
        ] = listPtrToRemove;

        // decrease numListings
        numListings = numListings - 1;
        // !don't remove from royatlies
        _isListed[listingToRemove.seller][listingToRemove.tokenAddr][
            listingToRemove.tokenId
        ] = false;
        assert(numListings >= 0);
        emit Unlisted(lastListing.tokenAddr, lastListing.tokenId);
        return true;
    }

    function status(
        address seller,
        address tokenAddr,
        uint256 tokenId
    )
        public
        view
        override
        returns (
            bool isSellerOwner,
            bool isTokenStillApproved,
            Listing memory listing
        )
    {
        listing = getListing(seller, tokenAddr, tokenId);

        // check that current owner is still the owner and the marketplace is still approved, otherwise unlist
        if (
            listing.nftType == NFT_TYPE.ERC721 ||
            listing.nftType == NFT_TYPE.ERC721_2981
        ) {
            isSellerOwner =
                IERC721(listing.tokenAddr).ownerOf(listing.tokenId) ==
                listing.seller;
            isTokenStillApproved = IERC721(listing.tokenAddr).isApprovedForAll(
                listing.seller,
                owner
            );
        } else if (
            listing.nftType == NFT_TYPE.ERC1155 ||
            listing.nftType == NFT_TYPE.ERC1155_2981
        ) {
            isSellerOwner =
                IERC1155(listing.tokenAddr).balanceOf(
                    listing.seller,
                    listing.tokenId
                ) >=
                listing.amount;
            isTokenStillApproved = IERC1155(listing.tokenAddr).isApprovedForAll(
                    listing.seller,
                    owner
                );
        }

        return (isSellerOwner, isTokenStillApproved, listing);
    }

    function unlistStale(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external override {
        uint256 a = 4;
    }

    function getListingPointer(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view override returns (uint256 listPtr) {
        require(isListed(msg.sender, tokenAddr, tokenId), "Token not listed");
        return _token2Ptr[seller][tokenAddr][tokenId];
    }

    // Method that checks if seller has listed tokenAddr:tokenId
    function isListed(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) public view override returns (bool listed) {
        return _isListed[seller][tokenAddr][tokenId];
    }

    function getListingByPointer(uint256 listPtr)
        external
        view
        override
        returns (Listing memory listing)
    {
        return _listings[listPtr];
    }

    function getListing(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) public view override returns (Listing memory listing) {
        console.log(
            "Listings.getListing: %s %s %s",
            seller,
            tokenAddr,
            tokenId
        );
        require(_isListed[seller][tokenAddr][tokenId], "Token not listed");
        console.log("isListed: %s", _isListed[seller][tokenAddr][tokenId]);
        return _listings[_token2Ptr[seller][tokenAddr][tokenId]];
    }

    function getAllListings()
        external
        view
        override
        returns (Listing[] memory listings)
    {
        return _listings;
    }

    function getRoyalties(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) public override returns (Royalty memory royalty) {
        royalty = _royalties[seller][tokenAddr][tokenId];
    }

    function reserve(
        address tokenAddr,
        uint256 tokenId,
        uint256 period,
        address reservee
    ) external override {
        uint256 a = 3;
    }

    function getReservedState(
        address seller,
        address tokenAddr,
        uint256 tokenId
    )
        external
        view
        override
        returns (address reservedFor, uint256 reservedUntil)
    {
        reservedFor = address(0);
        reservedUntil = 0;
    }

    function getType(address tokenAddr) public returns (NFT_TYPE tokenType) {
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
            tokenType = NFT_TYPE.ERC1155;
        } else if (isERC721 && !isERC2981) {
            tokenType = NFT_TYPE.ERC721;
        } else if (isERC1155 && isERC2981) {
            tokenType = NFT_TYPE.ERC1155_2981;
        } else if (isERC721 && isERC2981) {
            tokenType = NFT_TYPE.ERC721_2981;
        } else {
            tokenType = NFT_TYPE.UNKNOWN;
        }
    }
}
