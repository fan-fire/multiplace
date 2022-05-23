// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "./IMultiplace.sol";

abstract contract Storage is Ownable, AccessControl {
    address public currentMarketplace;
    address public protocolWallet;
    bytes32 public constant RESERVER_ROLE = keccak256("RESERVER_ROLE");
    uint256 public constant MAX_RESERVE_PERIOD = 24 * 60 * 60; /// can only reserve for a max of 1 day

    using Strings for address;
    using ERC165Checker for address;

    uint256 public numListings; //Number of listings in the marketplace
    mapping(address => bool) internal _isPaymentToken; //Whether a given ERC20 contract is an excepted payment token

    mapping(address => mapping(uint256 => address[])) internal _tokenListers; //Map of token addresses to the addresses of the sellers that have listed that token

    mapping(address => mapping(address => mapping(uint256 => IMultiplace.Royalty)))
        internal _royalties; //Royalties of each lister.tokenAddr.tokenId pair
    mapping(address => mapping(address => mapping(uint256 => bool)))
        internal _isListed; //Mapping from lister.tokenAddr.tokenId -> are there 1 or more of the token liste by lister
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        internal _token2Ptr; //Mapping from lister.tokenAddr.tokenId -> listPtr to quickly lookup the listing given lister.tokenAddr.tokenId
    mapping(address => mapping(address => uint256)) internal _balances; //Balances of each address for each ERC20 contract, 0x00 is the native coin

    uint256 public protocolFeeNumerator = 2500000000000; //Numerator of the protocol fee
    uint256 public protocolFeeDenominator = 100000000000000; //Denominator of the protocol fee
    IMultiplace.Listing[] internal _listings; //Listings of the marketplace

    // Future proof a bit with string mappings to use for storage
    mapping(string => string) public stringStorage;
    mapping(string => uint256) public uintStorage;
    mapping(string => bool) public boolStorage;
}
