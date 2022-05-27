// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;
// import "hardhat/console.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "./IMultiplace.sol";
import "./IListings.sol";

import "./Storage.sol";

contract Multiplace is IMultiplace, Storage, Pausable {
    constructor() {
        owner = msg.sender;
    }

    modifier listed(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) {
        require(
            listings.isListed(msg.sender, tokenAddr, tokenId),
            "Token is listed"
        );
        _;
    }

    modifier notListed(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) {
        require(
            !listings.isListed(msg.sender, tokenAddr, tokenId),
            "Token not listed"
        );
        _;
    }

    function list(
        address tokenAddr,
        uint256 tokenId,
        uint256 amount,
        uint256 unitPrice,
        address paymentToken
    )
        external
        override
        whenNotPaused
        notListed(msg.sender, tokenAddr, tokenId)
    {
        // check passed variable values
        require(admin.isPaymentToken(paymentToken), "Invalid payment token");
        listings.list(
            msg.sender,
            tokenAddr,
            tokenId,
            amount,
            unitPrice,
            paymentToken
        );

        IListings.Listing memory listing = listings.getListing(
            msg.sender,
            tokenAddr,
            tokenId
        );

        IListings.Royalty memory royalty = listings.getRoyalties(
            listing.seller,
            listing.tokenAddr,
            listing.tokenId
        );

        // emit Listed(
        //     listing.listPtr,
        //     listing.tokenAddr,
        //     listing.tokenId,
        //     listing.seller,
        //     listing.unitPrice,
        //     listing.amount,
        //     listing.paymentToken,
        //     listing.nftType,
        //     royalty.receiver,
        //     royalty.royaltyAmount
        // );
    }

    function buy(
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 amount
    ) external override {
        listings.buy(msg.sender, seller, tokenAddr, tokenId, amount);

        IListings.Listing memory listing = listings.getListing(
            seller,
            tokenAddr,
            tokenId
        );

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
            "Not approved ERC20"
        );

        // get royalties from mapping

        IListings.Royalty memory royalty = listings.getRoyalties(
            seller,
            tokenAddr,
            tokenId
        );

        // unlist token
        require(
            listings.buy(msg.sender, seller, tokenAddr, tokenId, amount),
            "Buy failed"
        );

        // transfer funds to marketplace

        require(
            IERC20(paymentToken).transferFrom(msg.sender, address(this), price),
            "ERC20 transfer failed"
        );

        // update _balances
        uint256 protocolAmount = (price * admin.protocolFeeNumerator()) /
            admin.protocolFeeDenominator();

        // pay seller
        _balances[paymentToken][listing.seller] =
            _balances[paymentToken][listing.seller] +
            price -
            royalty.royaltyAmount -
            protocolAmount;

        // pay artist
        _balances[paymentToken][royalty.receiver] =
            _balances[paymentToken][royalty.receiver] +
            royalty.royaltyAmount;

        // pay protocol
        _balances[paymentToken][admin.protocolWallet()] =
            _balances[paymentToken][admin.protocolWallet()] +
            protocolAmount;

        // INTEGRATIONS
        if (
            listing.nftType == IListings.NFT_TYPE.ERC721 ||
            listing.nftType == IListings.NFT_TYPE.ERC721_2981
        ) {
            IERC721(tokenAddr).safeTransferFrom(
                listing.seller,
                msg.sender,
                tokenId
            );
        } else if (
            listing.nftType == IListings.NFT_TYPE.ERC1155 ||
            listing.nftType == IListings.NFT_TYPE.ERC1155_2981
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
            IListings.Listing memory listing
        )
    {
        return (listings.status(seller, tokenAddr, tokenId));
    }

    function unlistStale(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external override {
        listings.unlistStale(seller, tokenAddr, tokenId);
    }

    function reserve(
        address tokenAddr,
        uint256 tokenId,
        uint256 period,
        address reservee
    ) external override {
        listings.reserve(tokenAddr, tokenId, period, reservee);
    }

    function getReservedState(
        address seller,
        address tokenAddr,
        uint256 tokenId
    )
        external
        override
        returns (address reservedFor, uint256 reservedUntil)
    {
        return (listings.getReservedState(seller, tokenAddr, tokenId));
    }

    function unlist(address tokenAddr, uint256 tokenId)
        public
        override
        whenNotPaused
    {
        listings.unlist(msg.sender, tokenAddr, tokenId);
    }

    function getListingPointer(
        address seller,
        address tokenAddr,
        uint256 tokenId
    )
        external
        view
        override
        listed(seller, tokenAddr, tokenId)
        returns (uint256 listPtr)
    {
        return listings.getListingPointer(seller, tokenAddr, tokenId);
    }

    // Method that checks if seller has listed tokenAddr:tokenId
    function isListed(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) public view override returns (bool listed) {
        return listings.isListed(seller, tokenAddr, tokenId);
    }

    function getListingByPointer(uint256 listPtr)
        external
        view
        override
        returns (IListings.Listing memory listing)
    {
        return listings.getListingByPointer(listPtr);
    }

    function getListing(
        address seller,
        address tokenAddr,
        uint256 tokenId
    )
        public
        view
        override
        listed(seller, tokenAddr, tokenId)
        returns (IListings.Listing memory listing)
    {
        return listings.getListing(seller, tokenAddr, tokenId);
    }

    function getAllListings()
        external
        view
        override
        returns (IListings.Listing[] memory)
    {
        return listings.getAllListings();
    }

    function getBalance(address paymentToken, address account)
        external
        override
        returns (uint256 balance)
    {
        require(admin.isPaymentToken(paymentToken), "Unkown payment token");
        return _balances[paymentToken][account];
    }

    function pullFunds(address paymentToken, uint256 amount) external override {
        // Checks
        require(
            admin.isPaymentToken(paymentToken),
            "Payment token not supported"
        );
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

    function updateAdmin(address newAdmin) public override onlyOwner {
        admin = IAdmin(newAdmin);
    }
}
