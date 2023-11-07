// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IPriceFeed {
    struct Data {
        uint256 timestamp;
        address signer;
        bytes signature;
        bytes prices; /* prices is an array of Price struct
        [ 
            { tokenIndex, price }, 
            { tokenIndex, price }, 
             ... 
        ] 
        */
    }

    struct Price {
        uint16 tokenIndex; // 2 bytes (max 65,535)
        uint48 price; // 6 bytes (max 281,474,976,710,655 with 8 decimals = 2,814,749.00000000)
    }
}