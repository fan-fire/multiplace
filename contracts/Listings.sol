// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "./IListings.sol";

contract Listings is IListings {
    using ERC165Checker for address;

    uint256 public constant MAX_RESERVE_PERIOD = 24 * 60 * 60; /// can only reserve for a max of 1 day
    address public owner;
    uint256 public numListings; //Number of listings in the marketplace
    Listing[] internal _listings; //Listings of the marketplace

    mapping(address => mapping(address => mapping(uint256 => bool)))
        internal _isListed; //Mapping from lister.tokenAddr.tokenId -> are there 1 or more of the token liste by lister
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        internal _token2Ptr; //Mapping from lister.tokenAddr.tokenId -> listPtr to quickly lookup the listing given lister.tokenAddr.tokenId
    mapping(address => mapping(address => mapping(uint256 => Royalty)))
        internal _unitRoyalties; //Royalties of each lister.tokenAddr.tokenId pair
    mapping(address => mapping(uint256 => address[])) internal _sellers; //Mapping from tokenAddr.tokenId -> array of addresses currently listing
    mapping(address => mapping(uint256 => mapping(address => uint256)))
        internal _sellersPtr; //Mapping from tokenAddr.tokenId.lister -> listersPtr to be able to pop a lister given the address

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
        address indexed seller,
        address buyer,
        uint256 unitPrice,
        uint256 amount,
        address paymentToken,
        IListings.NFT_TYPE nftType,
        address royaltyReceiver,
        uint256 unitRoyaltyAmount
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

        // update _sellers
        _sellers[tokenAddr][tokenId].push(lister);
        _sellersPtr[tokenAddr][tokenId][lister] =
            _sellers[tokenAddr][tokenId].length -
            1;

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
        //    else check if ERC721 or ERC1155 has owner(), if yes set artist=recever
        //    else set artist=0x00
        Royalty memory royalty = Royalty(address(0), 0);
        if (
            _nftType == NFT_TYPE.ERC1155_2981 ||
            _nftType == NFT_TYPE.ERC721_2981
        ) {
            address receiver;
            uint256 unitRoyaltyAmount;
            (receiver, unitRoyaltyAmount) = IERC2981(tokenAddr).royaltyInfo(
                tokenId,
                unitPrice
            );
            royalty = Royalty(receiver, unitRoyaltyAmount);
        } else {
            bytes memory data = abi.encodeWithSignature("owner()");
            (bool success, bytes memory returnData) = tokenAddr.call{value: 0}(
                data
            );

            // if nft has owner(), set it as royalty beneficiary
            if (success) {
                address returnedAddress;

                returnedAddress = abi.decode(returnData, (address));
                royalty = Royalty(returnedAddress, 0);
            } else {
                royalty = Royalty(address(0), 0);
            }
        }
        // set royalties mapping
        _unitRoyalties[lister][tokenAddr][tokenId] = royalty;

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
            royalty.unitRoyaltyAmount
        );
    }

    function unlist(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) public override onlyOwner {
        Listing memory listing = getListing(seller, tokenAddr, tokenId);
        // check reserving

        require(block.timestamp >= listing.reservedUntil, "Token reserved");
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

        require(listing.amount >= amount, "Not enough amount");

        // check if listing is still valid
        bool isSellerOwner;
        bool isTokenStillApproved;
        (isSellerOwner, isTokenStillApproved, listing) = status(
            seller,
            tokenAddr,
            tokenId
        );

        require(isSellerOwner, "NFT not owned by seller");
        require(isTokenStillApproved, "Marketplace not approved for NFT");

        // check reserving
        if (block.timestamp < listing.reservedUntil) {
            require(listing.reservedFor == buyer, "Token reserved");
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
            //     listing.unitRoyaltyAmount
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
        require(
            block.timestamp >= listingToRemove.reservedUntil,
            "Token reserved"
        );
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

        // update _sellers
        uint256 listerToRemoveIndx = _sellersPtr[listingToRemove.tokenAddr][
            listingToRemove.tokenId
        ][listingToRemove.seller];
        _sellers[listingToRemove.tokenAddr][listingToRemove.tokenId][
            listerToRemoveIndx
        ] = _sellers[listingToRemove.tokenAddr][listingToRemove.tokenId][
            _sellers[listingToRemove.tokenAddr][listingToRemove.tokenId]
                .length - 1
        ];
        _sellers[listingToRemove.tokenAddr][listingToRemove.tokenId].pop();

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

    function updateRoyalties(
        address updater,
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 newRoyaltyAmount
    ) public override onlyOwner {
        require(_isListed[seller][tokenAddr][tokenId], "NFT not listed");
        Royalty memory royalty = getUnitRoyalties(seller, tokenAddr, tokenId);
        require(royalty.receiver != address(0), "Token has no owner");
        require(
            royalty.receiver == updater,
            "Only royalty receiver can update"
        );
        require(
            royalty.unitRoyaltyAmount != newRoyaltyAmount,
            "Invalid amount"
        );

        Listing memory listing = getListing(seller, tokenAddr, tokenId);

        if (
            listing.nftType == NFT_TYPE.ERC721_2981 ||
            listing.nftType == NFT_TYPE.ERC1155_2981
        ) {
            address receiver;
            uint256 royaltyAmount;
            (receiver, royaltyAmount) = IERC2981(tokenAddr).royaltyInfo(
                tokenId,
                listing.unitPrice
            );
            royalty.receiver = receiver;
            royalty.unitRoyaltyAmount = royaltyAmount;
        } else {
            royalty.unitRoyaltyAmount = newRoyaltyAmount;
        }
        _unitRoyalties[seller][tokenAddr][tokenId] = royalty;
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
        // check that the NFT is listed
        require(_isListed[seller][tokenAddr][tokenId], "NFT not listed");

        // check if listing is still valid
        bool isSellerOwner;
        bool isTokenStillApproved;
        Listing memory listing;
        (isSellerOwner, isTokenStillApproved, listing) = status(
            seller,
            tokenAddr,
            tokenId
        );

        // if listing is still valid, do nothing

        if (isSellerOwner && isTokenStillApproved) {
            return;
        }

        // unlist
        // emit UnlistStale(tokenAddr, tokenId);

        require(_unlist(listing), "NFT could not be unlisted");
    }

    function getSellers(address tokenAddr, uint256 tokenId)
        public
        view
        override
        returns (address[] memory sellers)
    {
        return _sellers[tokenAddr][tokenId];
    }

    function getListingPointer(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view override returns (uint256 listPtr) {
        require(isListed(seller, tokenAddr, tokenId), "Token not listed");
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
        require(listPtr < _listings.length, "Invalid listing pointer");
        return _listings[listPtr];
    }

    function getListing(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) public view override returns (Listing memory listing) {
        require(_isListed[seller][tokenAddr][tokenId], "Token not listed");
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

    function getUnitRoyalties(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) public view override returns (Royalty memory royalty) {
        royalty = _unitRoyalties[seller][tokenAddr][tokenId];
    }

    function reserve(
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 period,
        address reservee
    ) external override onlyOwner {
        require(period < MAX_RESERVE_PERIOD, "Invalid period");
        require(_isListed[seller][tokenAddr][tokenId], "NFT not listed");

        Listing memory listing = getListing(seller, tokenAddr, tokenId);

        listing.reservedFor = reservee;
        listing.reservedUntil = block.timestamp + period;

        _listings[listing.listPtr] = listing;
        // emit Reserved(tokenAddr, tokenId, reservee, period, block.timestamp + period);
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
        Listing memory listing = getListing(seller, tokenAddr, tokenId);

        return (listing.reservedFor, listing.reservedUntil);
    }

    function getType(address tokenAddr)
        public
        view
        override
        returns (NFT_TYPE tokenType)
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

    function supportsInterface(bytes4 interfaceId)
        public
        pure
        override
        returns (bool)
    {
        return
            interfaceId == type(IListings).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
