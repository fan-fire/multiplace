// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "./Storage.sol";
import "./Listings.sol";
import "./Admin.sol";

contract MultiplaceProxy is Storage, Proxy {
    event Upgraded(address newAddress);

    constructor(address _currentMultiplace) {
        currentMultiplace = _currentMultiplace;
        admin = new Admin(msg.sender);
        listings = new Listings();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function upgrade(address _newAddress) public onlyRole(DEFAULT_ADMIN_ROLE) {
        currentMultiplace = _newAddress;
        emit Upgraded(_newAddress);
    }

    function _implementation() internal view override returns (address) {
        return currentMultiplace;
    }
}
