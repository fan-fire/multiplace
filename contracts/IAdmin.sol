pragma solidity 0.8.5;

interface IAdmin {
    event ProtocolWalletChanged(address newProtocolWallet);
    event ProtocolFeeChanged(uint256 feeNumerator, uint256 feeDenominator);
    event PaymentTokenAdded(address indexed paymentToken);

    function changeProtocolWallet(address newProtocolWallet) external;

    function changeProtocolFee(uint256 feeNumerator, uint256 feeDenominator)
        external;

    function addPaymentToken(address paymentToken) external;

    function isPaymentToken(address paymentToken) external returns (bool);

    function protocolFeeNumerator() external view returns (uint256);

    function protocolFeeDenominator() external view returns (uint256);

    function protocolWallet() external view returns (address);
}
