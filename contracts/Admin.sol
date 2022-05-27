pragma solidity 0.8.5;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IAdmin.sol";

contract Admin is IAdmin, AccessControl {
    address public _protocolWallet;
    mapping(address => bool) internal _isPaymentToken; //Whether a given ERC20 contract is an excepted payment token
    uint256 internal _protocolFeeNumerator = 25000000; //Numerator of the protocol fee
    uint256 internal _protocolFeeDenominator = 1000000000; //Denominator of the protocol fee

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function protocolWallet() public view override returns (address) {
        return _protocolWallet;
    }

    function protocolFeeNumerator() public view override returns (uint256) {
        return _protocolFeeNumerator;
    }

    function protocolFeeDenominator() public view override returns (uint256) {
        return _protocolFeeDenominator;
    }

    function changeProtocolWallet(address newProtocolWallet)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(newProtocolWallet != address(0), "0x00 not allowed");
        _protocolWallet = newProtocolWallet;
        emit ProtocolWalletChanged(newProtocolWallet);
    }

    function changeProtocolFee(uint256 feeNumerator, uint256 feeDenominator)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(feeDenominator != 0, "denominator cannot be 0");
        _protocolFeeNumerator = feeNumerator;
        _protocolFeeDenominator = feeDenominator;
        emit ProtocolFeeChanged(feeNumerator, feeDenominator);
    }

    function isPaymentToken(address paymentToken)
        public
        override
        returns (bool)
    {
        return _isPaymentToken[paymentToken];
    }

    function addPaymentToken(address paymentToken)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // check if payment token is in isPaymentToken
        require(!isPaymentToken(paymentToken), "Payment token already added");
        require(paymentToken != address(0), "0x00 not allowed");
        _isPaymentToken[paymentToken] = true;
        emit PaymentTokenAdded(paymentToken);
    }
}
