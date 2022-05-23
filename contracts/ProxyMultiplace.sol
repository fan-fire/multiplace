// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "./Storage.sol";

contract MultiplaceProxy is Storage, Proxy {
    event Upgraded(address newAddress);

    constructor(address _currentMarketplace) {
        currentMarketplace = _currentMarketplace;
        protocolWallet = owner();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RESERVER_ROLE, msg.sender);
    }

    function upgrade(address _newAddress) public onlyOwner {
        currentMarketplace = _newAddress;
        emit Upgraded(_newAddress);
    }

    function _implementation() internal view override returns (address) {
        return currentMarketplace;
    }
}
