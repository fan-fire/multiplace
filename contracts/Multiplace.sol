// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IMultiplace.sol";

import "./Storage.sol";

contract Multiplace is IMultiplace, Storage, Pausable, ReentrancyGuard {
    function list(
        address tokenAddr,
        uint256 tokenId,
        uint256 amount,
        uint256 unitPrice,
        address paymentToken
    ) external override {
        uint256 a = 4;
    }

    function buy(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external override {
        uint256 a = 4;
    }

    function status(
        address seller,
        address tokenAddr,
        uint256 tokenId
    )
        external
        view
        override
        returns (bool isSellerOwner, bool isTokenStillApproved)
    {
        uint256 a = 4;
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

    function unlist(address tokenAddr, uint256 tokenId) external override {
        uint256 a = 4;
    }

    function getListingPointer(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view override returns (uint256 listPtr) {
        uint256 a = 4;
    }

    function addPaymentToken(address paymentToken) external override {
        uint256 a = 4;
    }

    function changeProtocolWallet(address newProtocolWallet) external override {
        uint256 a = 4;
    }

    function changeProtocolFee(
        uint256 newProtocolFeeNumerator,
        uint256 newProtocolFeeDenominator
    ) external override {
        uint256 a = 4;
    }

    function isListed(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view override returns (bool hasBeenListed) {
        uint256 a = 4;
    }

    function isPaymentToken(address tokenAddress)
        external
        view
        override
        returns (bool isApproved)
    {
        uint256 a = 4;
    }

    function getBalance(address paymentToken, address account)
        external
        view
        override
        returns (uint256 balance)
    {
        uint256 a = 4;
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
        uint256 a = 4;
    }

    function getListing(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view override returns (Listing memory listing) {
        uint256 a = 4;
    }

    function getAllListings()
        external
        view
        override
        returns (Listing[] memory listings)
    {
        uint256 a = 4;
    }

    function getRoyalties(
        address seller,
        address tokenAddr,
        uint256 tokenId
    ) external view override returns (Royalty memory royalty) {
        uint256 a = 4;
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
        uint256 a = 4;
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
}
