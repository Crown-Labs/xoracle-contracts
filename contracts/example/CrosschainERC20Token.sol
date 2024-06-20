// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IXOracleMessage.sol";

contract CrosschainERC20Token is ERC20, Ownable {
    uint64 public immutable chainId;
    address public xOracleMessage;

    mapping (uint64 => address) public endpointTokens;

    event SendCrosschain(uint64 dstChainId, address from, address receiver, uint256 amount);
    event ReceivedCrosschain(uint64 srcChainId, address from, address receiver, uint256 amount);
    event SetEndpointToken(uint64 dstChainId, address token);

    constructor(
        string memory _name, 
        string memory _symbol, 
        address _xOracleMessage, 
        uint256 _initialSupply
    ) ERC20( _name, _symbol) {
        require(_xOracleMessage != address(0), "invalid address");

        chainId = uint64(block.chainid);
        xOracleMessage = _xOracleMessage;

        // mint initial supply
        _mint(msg.sender, _initialSupply);
    }

    /**
     * @dev Send token to another chain
     * @param _dstChainId destination chain id
     * @param _receiver receiver address
     * @param _amount amount to transfer
     */
    function sendCrosschain(uint64 _dstChainId, address _receiver, uint256 _amount) external payable {
        require(balanceOf(msg.sender) >= _amount, "ERC20: transfer amount exceeds balance");

        address endpoint = endpointTokens[_dstChainId];
        require(endpoint != address(0), "chainId not supported");

        // check fee
        uint256 fee = IXOracleMessage(xOracleMessage).getFee(_dstChainId);
        require(msg.value >= fee, "insufficient fee");

        // send message
        bytes memory payload = abi.encode(chainId, msg.sender, _receiver, _amount);
        IXOracleMessage(xOracleMessage).sendMessage{ value: msg.value }(payload, endpoint, _dstChainId);
        
        // burn from sender
        _burn(msg.sender, _amount);

        emit SendCrosschain(_dstChainId, msg.sender, _receiver, _amount);
    }

    /**
     * @dev Callback from xOracleMessage (sent from another chain)
     * @param _payload payload
     */
    function xOracleCall(bytes memory _payload) external {
        // check security callback
        require(msg.sender == xOracleMessage, "only xOracleMessage callback");

        // decode payload
        (
            uint64 _srcChainId, 
            address _from, 
            address _receiver, 
            uint256 _amount
        ) = abi.decode(_payload, (uint64, address, address, uint256));
        
        // mint to receiver
        _mint(_receiver, _amount);

        emit ReceivedCrosschain(_srcChainId, _from, _receiver, _amount);
    } 

    /**
     * @dev Set endpoint token address which is deployed on another chain
     * @param _dstChainId destination chain id 
     * @param _token token address
     */
    function setEndpointToken(uint64 _dstChainId, address _token) external onlyOwner {
        endpointTokens[_dstChainId] = _token;
        emit SetEndpointToken(_dstChainId, _token);
    }

    /**
     * @dev Faucet for receive 1,000 tokens
     */
    function faucet() external {
        uint256 faucetAmount = 1000 * 10**18;
        _mint(msg.sender, faucetAmount);
    }

    /**
     * @dev Get fee for sending crosschain
     * @param _dstChainId destination chain id
     */
    function getFee(uint64 _dstChainId) public view returns (uint256) {
        return IXOracleMessage(xOracleMessage).getFee(_dstChainId);
    }
}