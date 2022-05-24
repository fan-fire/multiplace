pragma solidity 0.8.4;

contract EmptyContractMock {}

contract MockThatOnlySupports165 {
    bytes4 constant ERC165ID = 0x01ffc9a7;

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        if (interfaceID == ERC165ID) {
            return true;
        } else {
            return false;
        }
    }
}
