// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

contract TestFulfillMessage {
    address public xOracleMessage;
    mapping(address => uint256) public balances;

    constructor(address _xOracleMessage) {
        xOracleMessage = _xOracleMessage;
    }

    function xOracleCall(bytes memory _payload) external {
        // check security callback
        require(msg.sender == xOracleMessage, "only xOracleMessage callback");

        // decode payload
        (address account, uint256 amount) = abi.decode(_payload, (address, uint256));
        
        // add balance
        addBalance(account, amount);
    }

    function addBalance(address _account, uint256 _amount) internal {
        balances[_account] += _amount;
    }

    function getBalance(address _account) external view returns (uint256) {
        return balances[_account];
    }
}