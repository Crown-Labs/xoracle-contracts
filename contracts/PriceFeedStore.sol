// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PriceFeedStore is Ownable {
    address public xOracle;
    string public name;
    uint256 public tokenIndex;
    uint256 public decimals;

    // price store
    struct PriceData {
        uint256 price;
        uint256 latestPrice;
        uint256 timestamp;
    }
    mapping(uint256 => PriceData) public pricesData;
    uint256 public latestRound;
    uint256 public latestTimestamp;

    event UpdatePrice(uint256 indexed tokenIndex, uint256 roundId, uint256 price, uint256 latestPrice, uint256 timestamp);
    event SetXOracle(address xOracle);

    modifier onlyXOracle() {
        require(xOracle == msg.sender, "xOracle: forbidden");
        _;
    }

    constructor(address _xOracle, string memory _name, uint256 _tokenIndex, uint256 _decimals) {
        require(_xOracle != address(0), "address invalid");
        xOracle = _xOracle;
        name = _name;
        tokenIndex = _tokenIndex;
        decimals = _decimals;
    }

    // ------------------------------
    // xOracle setPrice
    // ------------------------------
    function setPrice(uint256 _price, uint256 _timestamp) external onlyXOracle { 
        // Sometimes the fulfill request is not in order in a short time.
        // So it's possible that the price is not the latest price.
        // _price is the fulfilling price, but latestPrice is the newest price at the time.
        uint256 latestPrice;
        if (_timestamp > latestTimestamp) {
            latestPrice = _price;
            latestTimestamp = _timestamp;
        } else {
            latestPrice = pricesData[latestRound].latestPrice;
        }

        // next round
        latestRound++;

        // already checked correct tokenIndex in xOracle.setPriceFeedStore
        pricesData[latestRound] = PriceData({
            price: _price,
            latestPrice: latestPrice,
            timestamp: block.timestamp
        });

        emit UpdatePrice(tokenIndex, latestRound, _price, latestPrice, block.timestamp);
    }

    // ------------------------------
    // onlyOwner
    // ------------------------------
    function setXOracle(address _xOracle) external onlyOwner {
        require(_xOracle != address(0), "address invalid");
        xOracle = _xOracle;
        emit SetXOracle(_xOracle);
    }

    // ------------------------------
    // view function
    // ------------------------------
    function getLastPrice() external view returns (uint256, uint256, uint256, uint256) {
        PriceData memory priceData = pricesData[latestRound];
        return (
            latestRound, 
            priceData.price, 
            priceData.latestPrice, 
            priceData.timestamp
        );
    }

    function getPrice(uint256 _roundId) external view returns (uint256, uint256, uint256, uint256) {
        PriceData memory priceData = pricesData[_roundId];
        return (
            _roundId, 
            priceData.price, 
            priceData.latestPrice, 
            priceData.timestamp
        );
    }
}