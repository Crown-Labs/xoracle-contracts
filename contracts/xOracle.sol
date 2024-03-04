// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPriceFeed.sol";
import "./interfaces/IPriceFeedStore.sol";

contract XOracle is IPriceFeed, OwnableUpgradeable, PausableUpgradeable {
    // constants
    uint256 private constant TIMESTAMP_BITMASK = 2**256 - 4;
    uint256 private constant MINIMUM_EXPIRE_TIME = 1 minutes;
    uint256 private constant DEFAULT_EXPIRE_TIME = 5 minutes;
    uint256 private constant FULFILL_FEE_PRECISION = 10000;

    // controller
    mapping(address => bool) public controller;

    // signer
    mapping(address => bool) public signers;
    uint256 public totalSigner;
    uint256 public threshold;

    // whitelist
    mapping(address => bool) public whitelists;
    bool public onlyWhitelist;

    // request store
    struct Request {
        uint256 timestamp;
        address owner;
        bytes payload;
        uint256 status; // 0 = request,  1 = fulfilled, 2 = cancel, 3 = refund
        uint256 expiration;
        uint256 maxGasPrice;
        uint256 callbackGasLimit;
        uint256 depositReqFee;
        uint256 fulfillFee;
    }
    mapping(uint256 => Request) public requests;
    uint256 public reqId; // start with 1

    // request fee
    IERC20 public weth; // payment with WETH
    uint256 public fulfillFee;
    uint256 public minGasPrice;
    uint256 public minGasLimit;

    // price feed store
    mapping(uint256 => address) public priceFeedStores;

    // events
    event RequestPrices(uint256 indexed reqId, 
        uint256 timestamp,
        address owner,
        bytes payload,
        uint256 status,
        uint256 expiration,
        uint256 maxGasPrice,
        uint256 callbackGasLimit,
        uint256 depositReqFee,
        uint256 fulfillFee
    );
    event CancelRequestPrices(uint256 indexed reqId);
    event FulfillRequest(uint256 indexed reqId, bool success, string message);
    event TransferRequestFee(uint256 indexed _reqId, address from, address to, uint256 reqFee);
    event XOracleCall(uint256 indexed reqId, bool success, string message);
    event RefundRequest(uint256 indexed reqId);
    event SetPriceFeedStore(address priceFeedStore, uint256 tokenIndex);
    event SetController(address controller, bool flag);
    event SetSigner(address signer, bool flag);
    event SetThreshold(uint256 threshold);
    event SetWhitelist(address whitelist, bool flag);
    event SetOnlyWhitelist(bool flag);
    event SetFulfillFee(uint256 fulfillFee);
    event SetMinGasPrice(uint256 minGasPrice);
    event SetMinGasLimit(uint256 minGasLimit);

    modifier onlyController() {
        require(controller[msg.sender], "controller: forbidden");
        _;
    }

    modifier onlyContract() {
        require(msg.sender != tx.origin, "caller: only contract");
        _;
    }

    function initialize(address _weth) external initializer {
        OwnableUpgradeable.__Ownable_init();
        PausableUpgradeable.__Pausable_init();
    
        require(_weth != address(0), "address invalid");
        weth = IERC20(_weth);
    }

    // ------------------------------
    // request
    // ------------------------------
    function requestPrices(
        bytes calldata _payload, 
        uint256 _expiration, 
        uint256 _maxGasPrice, 
        uint256 _callbackGasLimit
    ) external onlyContract whenNotPaused returns (uint256) { 
        // check allow all or only whitelist
        require(!onlyWhitelist || whitelists[msg.sender], "whitelist: forbidden");

        // check gas price
        require(_maxGasPrice >= minGasPrice, "gas price is too low");

        // check mininum gas limit
        require(_callbackGasLimit > minGasLimit, "gas limit is too low");

        reqId++;

        // deposit request fee
        uint256 reqFee = transferRequestFee(reqId, msg.sender, address(this), _callbackGasLimit, _maxGasPrice, fulfillFee);

        // default expire time 
        if (_expiration < block.timestamp + MINIMUM_EXPIRE_TIME) {
            _expiration = block.timestamp + DEFAULT_EXPIRE_TIME;
        }

        // add request
        requests[reqId] = Request({
            timestamp: markdown(block.timestamp), 
            owner: msg.sender,
            payload: _payload,
            status: 0, // set status request
            expiration: _expiration,
            maxGasPrice: _maxGasPrice,
            callbackGasLimit: _callbackGasLimit,
            depositReqFee: reqFee,
            fulfillFee: fulfillFee
        });
        
        emit RequestPrices(
            reqId,
            requests[reqId].timestamp, 
            msg.sender,
            _payload,
            0,
            _expiration,
            _maxGasPrice,
            _callbackGasLimit,
            reqFee,
            fulfillFee
        );
        return reqId;
    }

    function cancelRequestPrice(uint256 _reqId) external whenNotPaused { 
        Request storage request = requests[_reqId];
        require(request.owner == msg.sender, "not owner request");
        require(request.status == 0, "status is not request");

        // set status cancel
        request.status = 2;

        // refund request fee
        IERC20(weth).transfer(request.owner, request.depositReqFee);

        emit CancelRequestPrices(_reqId);
    }

    // ------------------------------
    // fulfill request
    // ------------------------------
    function fulfillRequest(Data[] calldata _data, uint256 _reqId) external onlyController {
        Request storage request = requests[_reqId];
        if (request.status != 0) {
            return;
        }
        // set status executed
        request.status = 1;

        require(request.owner != address(0), "request not found");
        require(request.expiration > block.timestamp, "request is expired");

        // capture gas used
        uint256 gasStart = gasleft();

        // set price and collect gas used
        (bool priceUpdate, string memory message) = setPrices(request.timestamp, _data);
        uint256 gasUsedSetprice = gasStart - gasleft();

        // callback and collect gas used
        xOracleCallback(request.owner, _reqId, priceUpdate, request.payload, request.callbackGasLimit - gasUsedSetprice);
        uint256 gasUsed = gasStart - gasleft();
        
        // payment request fee
        uint256 reqFee = transferRequestFee(_reqId, address(this), msg.sender, gasUsed, tx.gasprice, request.fulfillFee);
        require(request.depositReqFee >= reqFee, "reqFee exceed depositReqFee");

        // refund request fee
        if (request.depositReqFee > reqFee) {
            IERC20(weth).transfer(request.owner, request.depositReqFee - reqFee);
        }

        emit FulfillRequest(_reqId, priceUpdate, message);
    }

    function refundRequest(uint256 _reqId) external onlyController {
        Request storage request = requests[_reqId];
        if (request.status != 0) {
            return;
        }
        // set status refund
        request.status = 3;

        // callback
        xOracleCallback(request.owner, _reqId, false, request.payload, request.callbackGasLimit);
        
        // refund request fee
        IERC20(weth).transfer(request.owner, request.depositReqFee);
        
        emit RefundRequest(_reqId);
    }

    // ------------------------------
    // static call function
    // ------------------------------
    function estimateGasUsed(address _callback, bytes calldata _payload, Data[] calldata _data) external {
        uint256 timestamp = _data[0].timestamp;
        uint256 gasStart = gasleft();
        
        // set price
        (bool priceUpdate, string memory message) = setPrices(timestamp, _data);

        // xOracleCallback with mockup reqId = 0
        if (priceUpdate) {
            (, bytes memory data) = _callback.call(abi.encodeWithSignature("xOracleCall(uint256,bool,bytes)", 0, priceUpdate, _payload));
            message = string(data);
        }
        
        // calcualte gas consumed and revert tx
        uint256 gasUsed = gasStart - gasleft();
        revert(string(abi.encodePacked("{\"gasUsed\":", StringsUpgradeable.toString(gasUsed), ",\"msg\":\"", message, "\"}")));
    }

    // ------------------------------
    // private function
    // ------------------------------
    function xOracleCallback(address _to, uint256 _reqId, bool _priceUpdate, bytes memory _payload, uint256 _callbackGasLimit) private {
        (bool success, bytes memory data) = _to.call{gas: _callbackGasLimit}(
            abi.encodeWithSignature("xOracleCall(uint256,bool,bytes)", _reqId, _priceUpdate, _payload)
        );
        emit XOracleCall(_reqId, success, string(data));
    }

    function setPrices(uint256 _timestamp, Data[] memory _data) private returns (bool, string memory) { 
        if (_data.length == 0) {
            return (false, "setPrices: no pricefeed data");
        }

        // find size by 8 bytes segments in prices
        uint256 size = _data[0].prices.length / 8;
        uint256[] memory tokenIndex = new uint256[](size);
        // dynamic allocate array two dimension with [prices.length] x [data.length]
        uint256[][] memory tokenIndexPrices; 
        // allocate for check signer
        address[] memory validSignerAddress = new address[](_data.length);
        uint256 validSigner = 0;

        // data proof
        for (uint256 i = 0; i < _data.length; i++) {
            // check timestamp
            if (_data[i].timestamp != _timestamp) {
                return (false, "setPrices: timestamp invalid");
            }

            // step 1: proof signature
            {
                (bool valid, address signerAddress) = validateSigner(_data[i].timestamp, _data[i].prices, _data[i].signature);
                if (!valid) {
                    continue;
                }

                // check signer duplicate
                for (uint256 s = 0; s < validSigner; s++) {
                    if (validSignerAddress[s] == signerAddress) {
                        return (false, "setPrices: signer duplicate");
                    }
                }
                validSignerAddress[validSigner] = signerAddress;
                validSigner++;
            }

            // step 2: decode prices
            {
                Price[] memory prices = decodePrices(_data[i].prices);

                if (i == 0) { 
                    // allocate first dimension
                    tokenIndexPrices = new uint256[][](prices.length);
                } else {
                    // check prices count of other signers must equal to signer[0]
                    if (prices.length != size) {
                        return (false, "setPrices: prices count of signer is not equal");
                    }
                }

                // collect tokenIndex and prices
                for (uint256 j = 0; j < prices.length; j++) {
                    if (i == 0) { 
                        // allocate second dimension
                        tokenIndexPrices[j] = new uint256[](_data.length);
                        // collect tokenIndex
                        tokenIndex[j] = uint256(prices[j].tokenIndex); 
                    }

                    // collect prices
                    tokenIndexPrices[j][i] = uint256(prices[j].price);
                }
            }
        }

        // check signer threshold
        if (validSigner < threshold) {
            return (false, "setPrices: signers under threshold");
        }
        
        // step 3: set prices to priceFeedStores
        for (uint256 i = 0; i < tokenIndex.length; i++) {
            uint256 medianPrice = getMedianPrice(tokenIndexPrices[i]);
            address priceFeed = priceFeedStores[tokenIndex[i]];
            if (priceFeed != address(0)) {
                IPriceFeedStore(priceFeed).setPrice(medianPrice, _timestamp);
            }
        }

        return (true, "");
    }

    function validateSigner(uint256 _timestamp, bytes memory _prices, bytes memory _signature) private view returns(bool, address) {
        bytes32 digest = ECDSAUpgradeable.toEthSignedMessageHash(
            keccak256(abi.encodePacked(_timestamp, _prices))
        );
        address recoveredSigner = ECDSAUpgradeable.recover(digest, _signature);
        return (signers[recoveredSigner], recoveredSigner);
    }

    function decodePrices(bytes memory _prices) private pure returns (Price[] memory) {
        // allocate by 8 bytes segments
        Price[] memory _pricesData = new Price[](_prices.length / 8);

        uint256 index = 0;
        for (uint256 i = 8; i <= _prices.length; i += 8) {
            uint16 tokenIndex;
            uint48 price;
            assembly {
                tokenIndex := mload(add(_prices, sub(i, 6))) // 2 bytes in tokenIndex
                price := mload(add(_prices, i)) // 6 bytes in price
            }

            _pricesData[index].tokenIndex = tokenIndex;
            _pricesData[index].price = price;
            index++;
        }

        return _pricesData;
    }

    function getMedianPrice(uint256[] memory _prices) private pure returns(uint256) {
        // gas optimize: direct find median price without sorting array before
        uint256 size = _prices.length;

        if (size % 2 == 1) {
            // odd size
            uint256 mid = (size / 2) + 1;

            for (uint256 i = 0; i < size; i++) {
                uint256 gte = 0;
                for (uint256 j = 0; j < size; j++) {
                    if (_prices[i] > _prices[j] || (_prices[i] == _prices[j] && i <= j)) {
                        gte++;
                    }
                }
                
                if (gte == mid) {
                    return _prices[i];
                }
            }
        } else {
            // even size
            uint256 mid1 = (size / 2);
            uint256 mid2 = (size / 2) + 1;
            uint256 val1;
            uint256 val2;

            for (uint256 i = 0; i < size; i++) {
                uint256 gte = 0;
                for (uint256 j = 0; j < size; j++) {
                    if (_prices[i] > _prices[j] || (_prices[i] == _prices[j] && i <= j)) {
                        gte++;
                    }
                }
                
                if (gte == mid1) {
                    val1 = _prices[i];
                } else if (gte == mid2) {
                    val2 = _prices[i];
                }

                if (val1 != 0 && val2 != 0) {
                    break;
                }
            }

            return (val1 + val2) / 2;
        }

        // ignore warning
        return 0;
    }

    function markdown(uint256 _timestamp) private pure returns (uint256) {
        return _timestamp & TIMESTAMP_BITMASK;
    }

    function transferRequestFee(uint256 _reqId, address _from, address _to, uint256 _gasUsed, uint256 _gasPrice, uint256 _fulfillFee) private returns(uint256) {
        if (_fulfillFee == 0) {
            return 0;
        }

        // calculate request fee
        uint256 reqFee = (_gasPrice * _gasUsed * (FULFILL_FEE_PRECISION + _fulfillFee)) / FULFILL_FEE_PRECISION;

        // transfer request fee
        if (_from != address(this)) {
            require(weth.balanceOf(_from) >= reqFee, "insufficient request fee");
            IERC20(weth).transferFrom(_from, _to, reqFee);
        } else {
            IERC20(weth).transfer(_to, reqFee);
        }

        emit TransferRequestFee(_reqId, _from, _to, reqFee);
        return reqFee;
    }

    // ------------------------------
    // onlyOwner
    // ------------------------------
    function adminRefundRequest(uint256 _reqId) external onlyOwner { 
        Request storage request = requests[_reqId];
        require(request.status == 0, "status is not request");

        // set status refund
        request.status = 3;

        // refund request fee
        IERC20(weth).transfer(request.owner, request.depositReqFee);

        emit RefundRequest(_reqId);
    }

    function setPriceFeedStore(address _priceFeedStore, uint256 _tokenIndex) external onlyOwner {
        require(_priceFeedStore != address(0), "address invalid");
        require(IPriceFeedStore(_priceFeedStore).tokenIndex() == _tokenIndex, "tokenIndex invalid");
        priceFeedStores[_tokenIndex] = _priceFeedStore;
        emit SetPriceFeedStore(_priceFeedStore, _tokenIndex);
    }

    function setPause(bool _flag) external onlyOwner {
        (_flag) ? _pause() : _unpause();
    }

    function setController(address _controller, bool _flag) external onlyOwner {
        require(_controller != address(0), "address invalid");
        controller[_controller] = _flag;
        emit SetController(_controller, _flag);
    }

    function setSigner(address _signer, bool _flag) external onlyOwner {
        require(_signer != address(0), "address invalid");
        if (_flag && !signers[_signer]) {
            totalSigner++;
        } else if (!_flag && signers[_signer]) {
            totalSigner--;
            if (threshold > totalSigner) {
                threshold = totalSigner;
            }
        }

        signers[_signer] = _flag;
        emit SetSigner(_signer, _flag);
    }

    function setThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold > 0 && _threshold <= totalSigner, "threshold invalid");
        threshold = _threshold;
        emit SetThreshold(_threshold);
    }

    function setWhitelist(address _whitelist, bool _flag) external onlyOwner {
        require(_whitelist != address(0), "address invalid");
        whitelists[_whitelist] = _flag;
        emit SetWhitelist(_whitelist, _flag);
    }

    function setOnlyWhitelist(bool _flag) external onlyOwner {
        onlyWhitelist = _flag;
        emit SetOnlyWhitelist(_flag);
    }

    function setFulfillFee(uint256 _fulfillFee) external onlyOwner {
        require(_fulfillFee < 5000, "fulfillFee < 50%");
        fulfillFee = _fulfillFee;
        emit SetFulfillFee(_fulfillFee);
    }

    function setMinGasPrice(uint256 _minGasPrice) external onlyOwner {
        minGasPrice = _minGasPrice;
        emit SetMinGasPrice(_minGasPrice);
    }

    function setMinGasLimit(uint256 _minGasLimit) external onlyOwner {
        minGasLimit = _minGasLimit;
        emit SetMinGasLimit(_minGasLimit);
    }

    // ------------------------------
    // view function
    // ------------------------------
    function getLastPrice(uint256 _tokenIndex) external view returns (uint256, uint256, uint256, uint256) {
        return IPriceFeedStore(priceFeedStores[_tokenIndex]).getLastPrice();
    }

    function getPrice(uint256 _tokenIndex, uint256 _roundId) external view returns (uint256, uint256, uint256, uint256) {
        return IPriceFeedStore(priceFeedStores[_tokenIndex]).getPrice(_roundId);
    }

    function latestRound(uint256 _tokenIndex) external view returns (uint256) {
        return IPriceFeedStore(priceFeedStores[_tokenIndex]).latestRound();
    }

    function getDecimals(uint256 _tokenIndex) external view returns (uint256) {
        return IPriceFeedStore(priceFeedStores[_tokenIndex]).decimals();
    }

    function getPriceFeed(uint256 _tokenIndex) external view returns (address) {
        return priceFeedStores[_tokenIndex];
    }

    function getRequest(uint256 _reqId) external view returns (uint256, address, bytes memory, uint256, uint256, uint256, uint256, uint256, uint256) {
        Request memory request = requests[_reqId];
        return (
            request.timestamp, 
            request.owner, 
            request.payload, 
            request.status, 
            request.expiration, 
            request.maxGasPrice,
            request.callbackGasLimit,
            request.depositReqFee,
            request.fulfillFee
        );
    }
}