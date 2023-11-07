// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IPriceFeedStore {
    function tokenIndex() external view returns (uint256);
    function decimals() external view returns (uint256);
    function getLastPrice() external view returns (uint256, uint256, uint256, uint256);
    function getPrice(uint256 roundId) external view returns (uint256, uint256, uint256, uint256);
    function latestRound() external view returns (uint256);
    function setPrice(uint256 price, uint256 timestamp) external;
}