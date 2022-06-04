// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "./IMultiplace.sol";
import "./IAdmin.sol";

abstract contract Storage is AccessControl {
    address public currentMarketplace;
    bytes32 public constant RESERVER_ROLE = keccak256("RESERVER_ROLE");
    address public _protocolWallet;
    mapping(address => bool) internal _isPaymentToken; //Whether a given ERC20 contract is an excepted payment token
    uint256 internal _protocolFeeNumerator = 250000000000; //Numerator of the protocol fee
    uint256 internal _protocolFeeDenominator = 10000000000000; //Denominator of the protocol fee

    address public owner;
    IAdmin public admin;
    IListings public listings;
    mapping(address => mapping(address => uint256)) internal _balances; //Balances of each address for each ERC20 contract, 0x00 is the native coin
}
