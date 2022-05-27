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
    uint256 public constant MAX_RESERVE_PERIOD = 24 * 60 * 60; /// can only reserve for a max of 1 day
    address public owner;
    IAdmin public admin;
    IListings public listings;
    mapping(address => mapping(address => uint256)) internal _balances; //Balances of each address for each ERC20 contract, 0x00 is the native coin

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
}
