// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IXOracle {
    function requestPrices(bytes memory payload, uint256 expiration) external payable returns (uint256);
    function xOracleCall(uint256 reqId, bool priceUpdate, bytes memory payload) external;
    function getLastPrice(uint256 tokenIndex) external view returns (uint256, uint256, uint256, uint256);
}

// ------------------------------
// RequestPrice 
// a simple contract to request price from xOracle
// ------------------------------
contract RequestPrices {
    // xoracle 
    address public xOracle;
    address public weth;

    modifier onlyXOracle() {
        require(msg.sender == xOracle, "xOracleCall: only xOracle callback");
        _;
    }

    constructor(address _xOracle, address _weth) {
        xOracle = _xOracle;
        weth = _weth;
    }

    // Request oracle prices
    function requestPrices() external {
        // allowance req fee
        IERC20(weth).approve(xOracle, type(uint256).max);

        // make payload and call
        bytes memory payload = ""; // no payload
        uint256 expiration = 0; // no expired
        IXOracle(xOracle).requestPrices(payload, expiration);
    }

    // ------------------------------
    // xOracle callback
    // ------------------------------
    function xOracleCall(uint256 /* _reqId */, bool /* _priceUpdate */, bytes memory /* _payload */) external onlyXOracle {
        // do nothing
        // ...
    }

    // ------------------------------
    // view function
    // ------------------------------
    function getPrice(uint256 _tokenIndex) external view returns (uint256) {
        // get last update price
        (, uint256 price, , ) = IXOracle(xOracle).getLastPrice(_tokenIndex);
        return price;
    }
}