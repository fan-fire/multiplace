// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IAdmin is IERC165 {
    function owner() external view returns (address);

    function changeProtocolWallet(address newProtocolWallet) external;

    function changeProtocolFee(uint256 feeNumerator, uint256 feeDenominator)
        external;

    function addPaymentToken(address paymentToken) external;

    function isPaymentToken(address paymentToken) external view returns (bool);

    function protocolFeeNumerator() external view returns (uint256);

    function protocolFeeDenominator() external view returns (uint256);

    function protocolWallet() external view returns (address);
}
