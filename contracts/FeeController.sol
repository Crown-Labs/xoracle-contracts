// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract FeeController is Ownable {
    mapping(uint64 => uint256) public fees;

    event SetFee(uint64 indexed dstChainId, uint256 fee);

    function getFee(uint64 /*_srcChainId*/, uint64 _dstChainId) external view returns(uint256) {
        return fees[_dstChainId];
    }

    function setFee(uint64 _dstChainId, uint256 _fee) external onlyOwner {
        fees[_dstChainId] = _fee;

        emit SetFee(_dstChainId, _fee);
    }
}