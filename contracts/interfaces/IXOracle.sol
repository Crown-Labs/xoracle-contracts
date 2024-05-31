// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IXOracle {
    function requestPrices(bytes memory payload, uint256 expiration, uint256 maxGasPrice, uint256 _callbackGasLimit) external payable returns (uint256);
    function cancelRequestPrice(uint256 _reqId) external;
    function xOracleCall(uint256 reqId, bool priceUpdate, bytes memory payload) external;
    function getLastPrice(uint256 tokenIndex) external view returns (uint256, uint256, uint256, uint256);
}