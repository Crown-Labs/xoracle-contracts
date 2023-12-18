// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract XOracleMessage is OwnableUpgradeable, PausableUpgradeable {
    // deployed chain id
    uint64 public chainId;

    // message nonce
    uint256 public sendMessageNonce;
    uint256 public fulfillMessageNonce;

    // fulfilled message hash
    mapping(bytes32 => bool) public fulfillMessageHashes;

    // controller
    mapping(address => bool) public controller;

    // signer
    mapping(address => bool) public signers;
    uint256 public totalSigner;
    uint256 public threshold;

    // whitelist
    mapping(address => bool) public whitelists;
    bool public onlyWhitelist;

    // events
    event SendMessage(uint256 indexed nonce, bytes payload, address receiver, uint64 srcChainId, uint64 dstChainId);
    event FulfillMessage(uint256 indexed nonce, bytes payload, address receiver, uint64 srcChainId, uint64 dstChainId, bytes32 srcTxHash);
    event XOracleCall(bytes32 indexed messageHash, bool success, string result);
    event SetMessageNonce(uint256 sendMessageNonce, uint256 fulfillMessageNonce);
    event SetController(address controller, bool flag);
    event SetSigner(address signer, bool flag);
    event SetThreshold(uint256 threshold);
    event SetWhitelist(address whitelist, bool flag);
    event SetOnlyWhitelist(bool flag);

    modifier onlyController() {
        require(controller[msg.sender], "controller: forbidden");
        _;
    }

    modifier onlyContract() {
        require(msg.sender != tx.origin, "caller: only contract");
        _;
    }

    function initialize(uint64 _chainId) external initializer {
        OwnableUpgradeable.__Ownable_init();
        PausableUpgradeable.__Pausable_init();

        require(_chainId > 0, "chainId invalid");
        chainId = _chainId;
    }

    // ------------------------------
    // send message
    // ------------------------------
    function sendMessage(bytes memory _payload, address _receiver, uint64 _dstChainId) external onlyContract whenNotPaused {
        // check allow all or only whitelist
        require(!onlyWhitelist || whitelists[msg.sender], "whitelist: forbidden");
        
        // check params
        require(_payload.length > 0, "payload invalid");
        require(_receiver != address(0), "receiver invalid");
        require(_dstChainId != chainId, "dstChainId invalid");

        // increase nonce
        sendMessageNonce++;

        emit SendMessage(sendMessageNonce, _payload, _receiver, chainId, _dstChainId);
    }

    // ------------------------------
    // fulfill message
    // ------------------------------
    function fulfillMessage(
        bytes memory _payload, 
        address _receiver, 
        uint64 _srcChainId, 
        uint64 _dstChainId, 
        bytes32 _srcTxHash,
        bytes[] memory signatures
    ) external onlyController {
        require(_payload.length > 0, "payload invalid");
        require(_receiver != address(0), "receiver invalid");
        require(_dstChainId == chainId, "dstChainId invalid");

        bytes32 messageHash = getMessageHash(_payload, _receiver, _srcChainId, _dstChainId, _srcTxHash);
        require(fulfillMessageHashes[messageHash] == false, "messageHash already fulfilled");

        // save messageHash
        fulfillMessageHashes[messageHash] = true;

        // increase nonce
        fulfillMessageNonce++;

        // verify signatures
        verifySignatures(messageHash, signatures);

        // callback and collect gas used
        xOracleCallback(messageHash, _payload, _receiver);

        emit FulfillMessage(fulfillMessageNonce, _payload, _receiver, _srcChainId, _dstChainId, _srcTxHash);
    }

    // ------------------------------
    // private function
    // ------------------------------
    function xOracleCallback(bytes32 _messageHash, bytes memory _payload, address _to) private {
        (bool success, bytes memory data) = _to.call(
            abi.encodeWithSignature("xOracleCall(bytes)", _payload)
        );
        emit XOracleCall(_messageHash, success, string(data));
    }

    function verifySignatures(bytes32 _messageHash, bytes[] memory _signatures) private view {
        // allocate for check signer
        address[] memory validSignerAddress = new address[](_signatures.length);
        uint256 validSigner = 0;
        for (uint256 i = 0; i < _signatures.length; i++) {
            (bool valid, address signerAddress) = validateSigner(_messageHash, _signatures[i]);
            if (!valid) {
                continue;
            }

            // check signer duplicate
            for (uint256 s = 0; s < validSigner; s++) {
                if (validSignerAddress[s] == signerAddress) {
                    revert("signer duplicate");
                }
            }
            validSignerAddress[validSigner] = signerAddress;
            validSigner++;
        }

        if (validSigner < threshold) {
            revert("signers under threshold");    
        }
    }

    function validateSigner(bytes32 _messageHash, bytes memory _signature) private view returns(bool, address) {
        bytes32 digest = ECDSAUpgradeable.toEthSignedMessageHash(_messageHash);
        address recoveredSigner = ECDSAUpgradeable.recover(digest, _signature);
        return (signers[recoveredSigner], recoveredSigner);
    }

    // ------------------------------
    // onlyOwner
    // ------------------------------
    function setMessageNonce(uint256 _sendMessageNonce, uint256 _fulfillMessageNonce) external onlyOwner {
        sendMessageNonce = _sendMessageNonce;
        fulfillMessageNonce = _fulfillMessageNonce;
        emit SetMessageNonce(_sendMessageNonce, _fulfillMessageNonce);
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

    // ------------------------------
    // view function
    // ------------------------------
    function getMessageHash(
        bytes memory _payload, 
        address _receiver,
        uint64 _srcChainId, 
        uint64 _dstChainId, 
        bytes32 _srcTxHash
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(_payload, _receiver, _srcChainId, _dstChainId, _srcTxHash));
    }

    function getMessageNonce() external view returns (uint256, uint256) {
        return (sendMessageNonce, fulfillMessageNonce);
    }

    function getMessageHashFulfilled(bytes32 _messageHash) external view returns (bool) {
        return fulfillMessageHashes[_messageHash];
    }
}