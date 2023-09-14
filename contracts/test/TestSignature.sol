// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

// change ECDSA lib to use upgradeable
// import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

contract TestSignature {
    function getMessageHash(
        uint256 timestamp,
        bytes memory prices
    ) public pure returns(bytes32) {
        return keccak256(abi.encodePacked(timestamp, prices));
    }

    function getSignedMessageHash(
        uint256 timestamp,
        bytes memory prices
    ) public pure returns(bytes32) {
        // 32 bytes
        return ECDSAUpgradeable.toEthSignedMessageHash(
            getMessageHash(timestamp, prices)
        );
    } 

    function validateSigner(
        uint256 timestamp,
        bytes memory prices,
        bytes memory signature
    ) public pure returns(address) {
        bytes32 digest = getSignedMessageHash(timestamp, prices);
        address recoveredSigner = ECDSAUpgradeable.recover(digest, signature);
        return recoveredSigner;
    } 
}