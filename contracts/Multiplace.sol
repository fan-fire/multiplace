// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;
// import "hardhat/console.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "./IMultiplace.sol";

import "./Storage.sol";

contract Multiplace is IMultiplace, Storage, Pausable, ReentrancyGuard {
    using Strings for address;
    using ERC165Checker for address;

    function list(
        address tokenAddr,
        uint256 tokenId,
        uint256 amount,
        uint256 unitPrice,
        address paymentToken
    ) external override whenNotPaused {
        // check passed variable values
        require(amount > 0, "Invalid amount");
        require(unitPrice > 0, "Invalid price");
        require(isPaymentToken(paymentToken), "Invalid payment token");

        // check that the NFT not listed already by sender
        require(
            !isListed(msg.sender, tokenAddr, tokenId),
            "NFT already listed by sender"
        );
        // update _isListed first to avoid reentrancy
        _isListed[msg.sender][tokenAddr][tokenId] = true;

        // check that we've got a valid 721 or 1155, either with, or without 2981
        NFT_TYPE _nftType = nftType(tokenAddr);
        require(_nftType != NFT_TYPE.UNKNOWN, "NFT type unknown");

        // check if sender owns NFT-tokenId
        // check that marketplace is allowed to transfer NFT-tokenId
        if (_nftType == NFT_TYPE.ERC1155 || _nftType == NFT_TYPE.ERC1155_2981) {
            require(
                IERC1155(tokenAddr).balanceOf(msg.sender, tokenId) >= amount,
                "Sender not owner of amount"
            );
            require(
                IERC1155(tokenAddr).isApprovedForAll(msg.sender, address(this)),
                "Marketplace not approved for ERC1155"
            );
        }
        if (_nftType == NFT_TYPE.ERC721 || _nftType == NFT_TYPE.ERC721_2981) {
            amount = 1;
            require(
                IERC721(tokenAddr).ownerOf(tokenId) == msg.sender,
                "Sender not owner"
            );
            require(
                IERC721(tokenAddr).isApprovedForAll(msg.sender, address(this)),
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
            msg.sender,
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
        _setRoyalties(msg.sender, tokenAddr, tokenId, royalty);

        // update _token2Ptr
        _token2Ptr[msg.sender][tokenAddr][tokenId] = listPtr;

        // add to _listings
        _listings.push(listing);

        emit Listed(
            listPtr,
            tokenAddr,
            tokenId,
            msg.sender,
            unitPrice,
            amount,
            paymentToken,
            _nftType,
            royalty.receiver,
            royalty.royaltyAmount
        );
    }

    function buy(
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 amount
    ) external override {
        // check if listing is still valid
        bool isSellerOwner;
        bool isTokenStillApproved;
        Listing memory listing;
        (isSellerOwner, isTokenStillApproved, listing) = status(
            seller,
            tokenAddr,
            tokenId
        );

        require(isSellerOwner, "NFT not owned by seller anymore");
        require(isTokenStillApproved, "NFT not approved anymore");

        // check reserving
        if (block.timestamp < listing.reservedUntil) {
            require(
                listing.reservedFor == msg.sender,
                "NFT reserved for another account"
            );
        }

        // check balance of msg.sender for listed item
        uint256 price = listing.unitPrice * listing.amount;
        address paymentToken = listing.paymentToken;

        require(
            IERC20(paymentToken).balanceOf(msg.sender) >= price,
            "Insufficient funds"
        );
        // check if marketplace is allowed to transfer payment token
        require(
            //  allowance(address owner, address spender)
            IERC20(paymentToken).allowance(msg.sender, address(this)) >= price,
            "Marketplace not approved"
        );

        // get royalties from mapping
        Royalty memory royalty = getRoyalties(seller, tokenAddr, tokenId);

        listing.amount = listing.amount - amount;

        // unlist token
        require(_unlist(listing), "Unlist failed");

        // transfer funds to marketplace

        require(
            IERC20(paymentToken).transferFrom(msg.sender, address(this), price),
            "ERC20 transfer failed"
        );

        // update _balances
        uint256 royaltyAmount = royalty.royaltyAmount;
        uint256 protocolAmount = (price * protocolFeeNumerator) /
            protocolFeeDenominator;

        // pay seller
        _balances[paymentToken][listing.seller] =
            _balances[paymentToken][listing.seller] +
            price -
            royaltyAmount -
            protocolAmount;

        // pay artist
        _balances[paymentToken][royalty.receiver] =
            _balances[paymentToken][royalty.receiver] +
            royaltyAmount;

        // pay protocol
        _balances[paymentToken][protocolWallet] =
            _balances[paymentToken][protocolWallet] +
            protocolAmount;

        // INTEGRATIONS
        if (
            listing.nftType == NFT_TYPE.ERC721 ||
            listing.nftType == NFT_TYPE.ERC721_2981
        ) {
            IERC721(tokenAddr).safeTransferFrom(
                listing.seller,
                msg.sender,
                tokenId
            );
        } else if (
            listing.nftType == NFT_TYPE.ERC1155 ||
            listing.nftType == NFT_TYPE.ERC1155_2981
        ) {
            IERC1155(tokenAddr).safeTransferFrom(
                listing.seller,
                msg.sender,
                tokenId,
                amount,
                ""
            );
        }
        emit Bought(
            listing.listPtr,
            tokenAddr,
            tokenId,
            msg.sender,
            listing.unitPrice,
            amount,
            paymentToken,
            listing.nftType,
            royalty.receiver,
            royalty.royaltyAmount
        );
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
                address(this)
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
                    address(this)
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

    function reserve(
        address tokenAddr,
        uint256 tokenId,
        uint256 period,
        address reservee
    ) external override {
        uint256 a = 4;
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
        uint256 a = 4;
    }

    function unlist(address tokenAddr, uint256 tokenId)
        public
        override
        whenNotPaused
    {
        Listing memory listing = getListing(msg.sender, tokenAddr, tokenId);
        // check reserving
        require(block.timestamp >= listing.reservedUntil, "NFT reserved");
        assert(_unlist(listing));
    }

    function _unlist(Listing memory listingToRemove) private returns (bool) {
        require(listingToRemove.amount == 0, "Still tokens left in listing");
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

    function getListingPointer(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view override returns (uint256 listPtr) {
        require(_isListed[seller][tokenAddr][tokenId], "Listing not found");
        return _token2Ptr[seller][tokenAddr][tokenId];
    }

    /**
     * @dev Method that only the owner of the Marketplace can call to add approved ERC20 address to be accepted as payment for listings
     * Requirements:
     *
     * - `paymentToken` must be a valid ERC20 address
     *
     * Emits a {PaymentTokenAdded} event.
     */
    function addPaymentToken(address paymentToken) public override onlyOwner {
        // check if payment token is in isPaymentToken
        require(!isPaymentToken(paymentToken), "Payment token already added");
        require(paymentToken != address(0), "0x00 not allowed");
        _isPaymentToken[paymentToken] = true;
        emit PaymentTokenAdded(paymentToken);
    }

    function changeProtocolWallet(address newProtocolWallet)
        external
        override
        onlyOwner
    {
        require(newProtocolWallet != address(0), "0x00 not allowed");
        protocolWallet = newProtocolWallet;
        emit ProtocolWalletChanged(newProtocolWallet);
    }

    function changeProtocolFee(
        uint256 newProtocolFeeNumerator,
        uint256 newProtocolFeeDenominator
    ) external override onlyOwner {
        require(newProtocolFeeDenominator != 0, "denominator cannot be 0");
        protocolFeeNumerator = newProtocolFeeNumerator;
        protocolFeeDenominator = newProtocolFeeDenominator;
        emit ProtocolFeeChanged(
            newProtocolFeeNumerator,
            newProtocolFeeDenominator
        );
    }

    // Method that checks if seller has listed tokenAddr:tokenId
    function isListed(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) public view override returns (bool hasBeenListed) {
        return _isListed[seller][tokenAddr][tokenId];
    }

    function nftType(address tokenAddr)
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

    function getBalance(address paymentToken, address account)
        external
        view
        override
        returns (uint256 balance)
    {
        require(isPaymentToken(paymentToken), "Unkown payment token");
        return _balances[paymentToken][account];
    }

    function getSeller(address tokenAddr, uint256 tokenId)
        external
        view
        override
        returns (address seller)
    {
        uint256 a = 4;
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
        require(
            _isListed[seller][tokenAddr][tokenId],
            "NFT not listed for sender"
        );
        return _listings[_token2Ptr[msg.sender][tokenAddr][tokenId]];
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
    ) public view override returns (Royalty memory royalty) {
        return _royalties[seller][tokenAddr][tokenId];
    }

    function updateRoyaltyAmount(
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 amount
    ) external override {
        uint256 a = 4;
    }

    function pullFunds(address paymentToken, uint256 amount) external override {
        // Checks
        require(isPaymentToken(paymentToken), "Payment token not supported");
        require(amount > 0, "Amount must be greater than 0");
        require(
            _balances[paymentToken][msg.sender] >= amount,
            "Insufficient funds"
        );
        // Effects
        uint256 curBalance = _balances[paymentToken][msg.sender];
        _balances[paymentToken][msg.sender] = curBalance - amount;

        // Integrations
        IERC20(paymentToken).transfer(msg.sender, amount);

        assert(_balances[paymentToken][msg.sender] == curBalance - amount);
        emit FundsWithdrawn(msg.sender, paymentToken, amount);
    }

    /**
     * @dev Method to pause the marketplace.
     *
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Method to unpause the marketplace.
     *
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    function _setRoyalties(
        address lister,
        address tokenAddr,
        uint256 tokenId,
        Royalty memory royalty
    ) internal whenNotPaused {
        _royalties[lister][tokenAddr][tokenId] = royalty;
        emit RoyaltiesSet(
            msg.sender,
            tokenAddr,
            tokenId,
            royalty.receiver,
            royalty.royaltyAmount
        );
    }

    /**
     * @dev External view method to check if a ERC20 token is accepted as payment for listings
     * Requirements:
     *
     * - `tokenAddress` must be a valid ERC20 address
     */
    function isPaymentToken(address tokenAddress)
        public
        view
        override
        returns (bool isApproved)
    {
        return _isPaymentToken[tokenAddress];
    }
}
