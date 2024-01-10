// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IXOracleMessage {
    function sendMessage(bytes memory payload, address endpoint, uint64 dstChainId) external payable returns(uint256);
}

contract WrapSendMessage {
    address public xOracleMessage;

    constructor(address _xOracleMessage) {
        xOracleMessage = _xOracleMessage;
    }

    function sendMessage(bytes memory _payload, address _endpoint, uint64 _dstChainId) external payable returns (uint256) {
        return IXOracleMessage(xOracleMessage).sendMessage{ value: msg.value }(_payload, _endpoint, _dstChainId);
    }

}