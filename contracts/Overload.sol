// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

contract Overload {
    uint256 public a;
    uint256 public b;

    function buy(uint256 _a) public {
        a = _a;
    }

    function buy(uint256 _a, uint256 _b) public {
        a = _a;
        b = _b;
    }
}
