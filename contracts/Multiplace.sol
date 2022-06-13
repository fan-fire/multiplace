// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;
import "hardhat/console.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "./IListings.sol";
import "./IMultiplace.sol";
import "./IAdmin.sol";
import "./Storage.sol";

contract Multiplace is IMultiplace, Storage, Pausable {
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function list(
        address tokenAddr,
        uint256 tokenId,
        uint256 amount,
        uint256 unitPrice,
        address paymentToken
    ) external override whenNotPaused {
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

        IListings.Royalty memory royalty = listings.getUnitRoyalties(
            listing.seller,
            listing.tokenAddr,
            listing.tokenId
        );

        emit Listed(
            listing.listPtr,
            listing.tokenAddr,
            listing.tokenId,
            listing.seller,
            listing.unitPrice,
            listing.amount,
            listing.paymentToken,
            listing.nftType,
            royalty.receiver,
            royalty.unitRoyaltyAmount
        );
    }

    function buy(
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 amount
    ) external override {
        IListings.Listing memory listing = listings.getListing(
            seller,
            tokenAddr,
            tokenId
        );

        // check balance of msg.sender for listed item
        uint256 totalPrice = listing.unitPrice * amount;
        address paymentToken = listing.paymentToken;

        uint256 balance = IERC20(paymentToken).balanceOf(msg.sender);

        require(amount <= listing.amount, "Not enough amount in listing");
        require(balance >= totalPrice, "Insufficient funds");
        // check if marketplace is allowed to transfer payment token
        require(
            //  allowance(address owner, address spender)
            IERC20(paymentToken).allowance(msg.sender, address(this)) >=
                totalPrice,
            "Not approved for enough ERC20"
        );

        // get royalties from mapping

        IListings.Royalty memory royalty = listings.getUnitRoyalties(
            seller,
            tokenAddr,
            tokenId
        );

        uint256 totalRoyalty = royalty.unitRoyaltyAmount * amount;

        // unlist token
        require(
            listings.buy(msg.sender, seller, tokenAddr, tokenId, amount),
            "Buy failed"
        );

        // transfer funds to marketplace

        require(
            IERC20(paymentToken).transferFrom(
                msg.sender,
                address(this),
                totalPrice
            ),
            "ERC20 transfer failed"
        );

        // update _balances
        uint256 totalProtocolFee = (totalPrice * admin.protocolFeeNumerator()) /
            admin.protocolFeeDenominator();

        // pay seller
        _balances[paymentToken][listing.seller] =
            _balances[paymentToken][listing.seller] +
            totalPrice -
            totalRoyalty -
            totalProtocolFee;

        // pay artist
        _balances[paymentToken][royalty.receiver] =
            _balances[paymentToken][royalty.receiver] +
            totalRoyalty;

        // pay protocol
        _balances[paymentToken][admin.protocolWallet()] =
            _balances[paymentToken][admin.protocolWallet()] +
            totalProtocolFee;

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
            royalty.unitRoyaltyAmount
        );
    }

    function unlist(address tokenAddr, uint256 tokenId)
        public
        override
        whenNotPaused
    {
        require(
            listings.isListed(msg.sender, tokenAddr, tokenId),
            "Token not listed for msg.sender"
        );
        listings.unlist(msg.sender, tokenAddr, tokenId);
        emit Unlisted(msg.sender, tokenAddr, tokenId);
    }

    function unlistStale(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external override {
        listings.unlistStale(seller, tokenAddr, tokenId);
        emit UnlistStale(seller, tokenAddr, tokenId);
    }

    function reserve(
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 period,
        address reservee
    ) external override onlyRole(RESERVER_ROLE) {
        listings.reserve(seller, tokenAddr, tokenId, period, reservee);
        emit Reserved(seller, tokenAddr, tokenId, reservee, period);
    }

    function updateRoyalties(
        address seller,
        address tokenAddr,
        uint256 tokenId,
        uint256 newRoyaltyAmount
    ) public override {
        listings.updateRoyalties(
            msg.sender,
            seller,
            tokenAddr,
            tokenId,
            newRoyaltyAmount
        );

        emit RoyaltiesSet(seller, tokenAddr, tokenId, newRoyaltyAmount);
    }

    function addPaymentToken(address paymentToken)
        public
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            !admin.isPaymentToken(paymentToken),
            "Payment token already added"
        );
        admin.addPaymentToken(paymentToken);
        emit PaymentTokenAdded(paymentToken);
    }

    function pullFunds(address paymentToken, uint256 amount) external override {
        // Checks
        require(
            admin.isPaymentToken(paymentToken),
            "Payment token not supported"
        );
        require(amount > 0, "Invalid amount");
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

    function changeProtocolWallet(address newProtocolWallet)
        public
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        admin.changeProtocolWallet(newProtocolWallet);
        emit ProtocolWalletChanged(newProtocolWallet);
    }

    function changeProtocolFee(uint256 feeNumerator, uint256 feeDenominator)
        public
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        admin.changeProtocolFee(feeNumerator, feeDenominator);
        emit ProtocolFeeChanged(feeNumerator, feeDenominator);
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /* ---------------------------------------------*
     *                                               *
     *                                               *
     *                  VIEW METHODS                 *
     *                                               *
     *                                               *
     * ----------------------------------------------*/

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
        return (listings.getReservedState(seller, tokenAddr, tokenId));
    }

    function getListingPointer(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view override returns (uint256 listPtr) {
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
    ) public view override returns (IListings.Listing memory listing) {
        require(
            listings.isListed(seller, tokenAddr, tokenId),
            "Token not listed"
        );
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
        view
        override
        returns (uint256 balance)
    {
        require(admin.isPaymentToken(paymentToken), "Unkown payment token");
        return _balances[paymentToken][account];
    }

    function isPaymentToken(address paymentToken)
        public
        view
        override
        returns (bool)
    {
        return admin.isPaymentToken(paymentToken);
    }

    function getUnitRoyalties(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) public view override returns (IListings.Royalty memory royalty) {
        return listings.getUnitRoyalties(seller, tokenAddr, tokenId);
    }

    function getSellers(address tokenAddr, uint256 tokenId)
        public
        view
        override
        returns (address[] memory sellers)
    {
        return listings.getSellers(tokenAddr, tokenId);
    }

    function getListings(address tokenAddr, uint256 tokenId)
        public
        view
        override
        returns (IListings.Listing[] memory _listings)
    {
        address[] memory sellers = getSellers(tokenAddr, tokenId);
        _listings = new IListings.Listing[](sellers.length);

        for (uint256 i = 0; i < sellers.length; i++) {
            _listings[i] = listings.getListing(sellers[i], tokenAddr, tokenId);
        }
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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(IERC165, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IMultiplace).interfaceId ||
            interfaceId == type(IAccessControl).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function protocolFeeNumerator() public view override returns (uint256) {
        return admin.protocolFeeNumerator();
    }

    function protocolFeeDenominator() public view override returns (uint256) {
        return admin.protocolFeeDenominator();
    }

    function protocolWallet() public view override returns (address) {
        return admin.protocolWallet();
    }
}
