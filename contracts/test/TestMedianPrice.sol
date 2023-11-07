// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

contract TestMedianPrice {
    function getMedianPrice(uint256[] memory _prices) external pure returns(uint256) {
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
}