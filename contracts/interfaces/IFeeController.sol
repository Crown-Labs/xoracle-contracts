// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IFeeController {
    function getFee(uint64 srcChainId, uint64 dstChainId) external view returns(uint256);
}