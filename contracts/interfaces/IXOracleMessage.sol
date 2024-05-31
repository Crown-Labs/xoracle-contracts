// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IXOracleMessage {
    function sendMessage(bytes memory payload, address endpoint, uint64 dstChainId) external payable returns(uint256);
    function getFee(uint64 dstChainId) external view returns(uint256);
}
