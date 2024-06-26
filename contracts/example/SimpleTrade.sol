// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IXOracle.sol";

// ------------------------------
// SimpleTrade 
// a simple trading contract (with LONG only, no leverage)
// for example integration with xOracle
// ------------------------------
contract SimpleTrade {
    // xoracle 
    address public xOracle;
    address public weth;
    mapping (uint256 => uint256) public requestMap;

    // apps
    struct Position {
        uint256 positionId;
        address owner;
        uint256 tokenIndex; // 0 = BTC, 1 = ETH, 3 = BNB
        uint256 entryPrice;
        uint256 amount;
        bool realizeAsProfit; // true = profit or false = loss
        uint256 realizePL;
        uint256 status; // 0 = pending, 1 = revert (can't open), 2 = open, 3 = closed
    }
    mapping (uint256 => Position) public positions;
    uint256 public lastPositionId;
    mapping (uint256 => bool) public tokenIndexList;

    uint256 public maximumBuyAmount = 1000000 * 10**18; // max 1,000,000

    // events
    event RequestOpenPosition(address indexed owner, uint256 indexed positionId, uint256 reqId);
    event OpenPosition(address indexed owner, uint256 indexed positionId, bool result);
    event ClosePosition(address indexed owner, uint256 indexed positionId, bool result);

    constructor(address _xOracle, address _weth) {
        require(_xOracle != address(0), "address invalid");
        require(_weth != address(0), "address invalid");
        xOracle = _xOracle;
        weth = _weth;

        tokenIndexList[0] = true; // allow BTC
        tokenIndexList[1] = true; // allow ETH
        tokenIndexList[2] = true; // allow BNB
        tokenIndexList[6] = true; // allow DOGE
    }

    // ------------------------------
    // user request open / close position
    // ------------------------------
    function openPosition(uint256 _tokenIndex, uint256 _amount) external {
        require(tokenIndexList[_tokenIndex], "token index not in list");
        require(_amount > 0 && _amount < maximumBuyAmount, "limit buy amount 0-10000");

        uint256 positionId = lastPositionId;
        lastPositionId++;

        // store position
        positions[positionId] = Position({
            positionId: positionId,
            owner: msg.sender,
            tokenIndex: _tokenIndex,
            entryPrice: 0,
            amount: _amount,
            realizeAsProfit: false,
            realizePL: 0,
            status: 0 // pendding
        });

        // allowance req fee
        IERC20(weth).approve(xOracle, type(uint256).max);

        // make payload and call
        bool isOpenPosition = true;
        bytes memory payload = abi.encode(positionId, isOpenPosition);
        uint256 expired = 0; // no expiration
        uint256 maxGasPrice = 10e9; // 10 gwei
        uint256 callbackMaxGasLimit = 5000000; // 5M
        uint256 reqId = IXOracle(xOracle).requestPrices(payload, expired, maxGasPrice, callbackMaxGasLimit);

        // optional for cross check
        requestMap[reqId] = positionId;

        emit RequestOpenPosition(msg.sender, positionId, reqId);        
    }

    function closePosition(uint256 _positionId) external {
        Position memory position = positions[_positionId];
        require(position.owner == msg.sender, "not position owner");
        require(position.status == 2, "position not open");

        // allowance req fee
        IERC20(weth).approve(xOracle, type(uint256).max);

        // make payload and call
        bool isOpenPosition = false;
        bytes memory payload = abi.encode(_positionId, isOpenPosition);
        uint256 expired = 0; // no expiration
        uint256 maxGasPrice = 10e9; // 10 gwei
        uint256 callbackMaxGasLimit = 5000000; // 5M
        uint256 reqId = IXOracle(xOracle).requestPrices(payload, expired, maxGasPrice, callbackMaxGasLimit);

        // internal self-check (optional) 
        requestMap[reqId] = _positionId;
    }

    // ------------------------------
    // xOracle callback
    // ------------------------------
    function xOracleCall(uint256 _reqId, bool _priceUpdate, bytes memory _payload) external {
        // security callback
        require(msg.sender == xOracle, "xOracleCall: only xOracle callback");
        
        // decode payload
        (uint256 positionId, bool isOpenPosition) = abi.decode(_payload, (uint256, bool));
        
        // internal self-check, reject multiple calls 
        require(requestMap[_reqId] == positionId, "request mapping not match");
        delete requestMap[_reqId];

        // apps
        if (isOpenPosition) {
            _openPosition(_priceUpdate, positionId);
        } else {
            _closePosition(_priceUpdate, positionId);
        }
    }

    // ------------------------------
    // private function
    // ------------------------------
    function _openPosition(bool _priceUpdate, uint256 _positionId) private {
        Position storage position = positions[_positionId];
        require(position.status == 0, "position status is not pending");
        
        // make sure that price is updated
        if (!_priceUpdate) {
            // decide to revert position
            position.status = 1; // revert
            emit OpenPosition(position.owner, _positionId, false);
            return;
        }

        // get last update price
        (, uint256 price, , ) = IXOracle(xOracle).getLastPrice(position.tokenIndex);

        // update position
        position.entryPrice = price;
        position.status = 2; // open

        emit OpenPosition(position.owner, _positionId, true);
    }

    function _closePosition(bool _priceUpdate, uint256 _positionId) private {
        Position storage position = positions[_positionId];
        require(position.status == 2, "position status is not open");
        
        // make sure that price is updated
        if (!_priceUpdate) {
            // decide to do noting
            emit ClosePosition(position.owner, _positionId, false);
            return;
        }

        // get last update price
        (, uint256 price, , ) = IXOracle(xOracle).getLastPrice(position.tokenIndex);

        // update position
        position.realizeAsProfit = price > position.entryPrice;
        uint256 priceChange = position.realizeAsProfit ? (price - position.entryPrice) : (position.entryPrice - price);
        position.realizePL = priceChange * position.amount / 10**18;
        position.status = 3; // closed
        
        emit OpenPosition(position.owner, _positionId, true);
    }

    // ------------------------------
    // view function
    // ------------------------------
    function getPosition(uint256 _positionId) external view returns (Position memory) {
        return positions[_positionId];
    }

    function getPositions(address _owner) external view returns (Position[] memory) {
        if (lastPositionId == 0) {
            revert("no positions");
        }

        // count owned positions
        uint256 size = 0;
        for (uint256 i = 0; i < lastPositionId; i++) {
            if (positions[i].owner == _owner) {
                size++;
            }
        }

        // allocate with size
        Position[] memory _positions = new Position[](size);
        uint256 index = 0;

        // find owned positions
        for (uint256 i = 0; i < lastPositionId; i++) {
            if (positions[i].owner == _owner) {
                _positions[index] = positions[i];
                index++;
            }
        }
        return _positions;
    }
}