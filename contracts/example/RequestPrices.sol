// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IXOracle.sol";

// ------------------------------
// RequestPrices 
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
        uint256 expired = 0; // no expiration
        uint256 maxGasPrice = 10e9; // 10 gwei
        uint256 callbackMaxGasLimit = 5000000; // 5M
        IXOracle(xOracle).requestPrices(payload, expired, maxGasPrice, callbackMaxGasLimit);
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
