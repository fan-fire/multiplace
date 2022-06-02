pragma solidity 0.8.5;
import "./IAdmin.sol";

contract Admin is IAdmin {
    address internal _owner;
    mapping(address => bool) internal _isPaymentToken; //Whether a given ERC20 contract is an excepted payment token
    uint256 internal _protocolFeeNumerator = 2500000000000; //Numerator of the protocol fee
    uint256 internal _protocolFeeDenominator = 100000000000000; //Denominator of the protocol fee
    address internal _protocolWallet;
    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(address _initProtocolWallet) {
        _owner = msg.sender;
        _protocolWallet = _initProtocolWallet;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Not owner contract");
        _;
    }

    function owner() public view override returns (address) {
        return _owner;
    }

    function changeProtocolWallet(address newProtocolWallet)
        external
        override
        onlyOwner
    {
        require(newProtocolWallet != address(0), "0x00 not allowed");
        _protocolWallet = newProtocolWallet;
        emit ProtocolWalletChanged(newProtocolWallet);
    }

    function changeProtocolFee(uint256 feeNumerator, uint256 feeDenominator)
        external
        override
        onlyOwner
    {
        require(feeDenominator != 0, "denominator cannot be 0");
        _protocolFeeNumerator = feeNumerator;
        _protocolFeeDenominator = feeDenominator;
        emit ProtocolFeeChanged(feeNumerator, feeDenominator);
    }

    function addPaymentToken(address paymentToken) external override onlyOwner {
        // check if payment token is in isPaymentToken
        require(!isPaymentToken(paymentToken), "Payment token already added");
        require(paymentToken != address(0), "0x00 not allowed");
        _isPaymentToken[paymentToken] = true;
        emit PaymentTokenAdded(paymentToken);
    }

    function isPaymentToken(address paymentToken)
        public
        view
        override
        returns (bool)
    {
        return _isPaymentToken[paymentToken];
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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return
            interfaceId == type(IAdmin).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
